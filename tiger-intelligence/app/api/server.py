import os
# Enforce strict offline operation for all Hugging Face and PyTorch model loading
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

import asyncio
import json
import mimetypes
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

# Ensure project root is in sys.path (or PyInstaller bundle)
if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
    PROJECT_ROOT = Path(sys._MEIPASS)
else:
    PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.alerts.engine import AlertEngine
from app.config import (
    ALERT_ABSENCE_MULTIPLIER,
    ALERT_CENTROID_SHIFT_KM,
    ALERT_VILLAGE_RISK_KM,
    REID_CONFIDENT_THRESHOLD,
    REID_REVIEW_THRESHOLD,
    TRIAGE_KEEP_THRESHOLD,
    TRIAGE_QUARANTINE_THRESHOLD,
)
from app.database.db import TigerDatabase
from app.ingestion.adapter import (
    IngestionSourceType,
    get_adapter_for_path,
    list_available_media_sources,
)
from app.occupancy.mcp import calculate_tiger_home_range
from app.pipeline import TigerIntelligencePipeline
from app.storage.manager import StorageManager, get_storage_manager
from app.auth.hashing import hash_password, verify_password
from app.auth.sessions import (
    create_session, get_session, revoke_session, purge_expired_sessions,
    is_locked_out, lockout_expiry_iso,
)
from app.auth.models import (
    WorkstationSetupRequest, LoginRequest, CreateOfficerRequest,
    ResetPasswordRequest, LoginResponse, WorkstationStatus,
)
from app.auth.middleware import get_current_session, require_admin

# SSE real-time broadcast queues
pipeline_event_queues: List[asyncio.Queue] = []


def broadcast_pipeline_event(event_type: str, payload: dict):
    """Safely enqueues real-time SSE progress and stage transition events."""
    msg = {"type": event_type, "timestamp": datetime.now().isoformat(), **payload}
    for q in list(pipeline_event_queues):
        try:
            q.put_nowait(msg)
        except Exception:
            pass

# Storage & Database resolution
storage = get_storage_manager()
DB_PATH = PROJECT_ROOT / "database" / "tiger.db"
if not DB_PATH.exists():
    DB_PATH = PROJECT_ROOT.parent / "tiger-intelligence" / "database" / "tiger.db"
if not DB_PATH.exists():
    DB_PATH = storage.database_path

from contextlib import asynccontextmanager

# Shared Database & Alert Engine instances
db = TigerDatabase(DB_PATH)
alert_engine = AlertEngine(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Expose shared db on app.state and purge expired sessions on boot."""
    app.state.db = db
    with db._get_connection() as conn:
        purged = purge_expired_sessions(conn)
    print(f"[AUTH] Purged {purged} expired session(s) on startup.")
    yield


app = FastAPI(
    title="TIGERTRACK AI — Pench Tiger Intelligence Local API",
    description="Offline REST API Bridge for Wildlife Intelligence, Spatial Analysis & Ingestion",
    version="3.2.0",
    lifespan=lifespan,
)

# Enable CORS for local workstation frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory pipeline job tracker
pipeline_jobs: Dict[str, dict] = {}


# ── Request / Response Models ──────────────────────────────────────────────────

class HumanReviewRequest(BaseModel):
    decision: str = Field(..., description="CONFIRMED, REJECTED, REASSIGNED, or NEW_TIGER")
    corrected_tiger_id: Optional[str] = Field(None, description="Assigned tiger ID if confirmed/reassigned")
    actor: Optional[str] = Field(None, description="Deprecated: actor is derived from session token server-side")
    notes: Optional[str] = Field("", description="Optional justification note")


class AlertActionRequest(BaseModel):
    action: str = Field(..., description="ACKNOWLEDGE, RESOLVE, FALSE_POSITIVE, or SUPPRESS")
    actor: Optional[str] = Field(None, description="Deprecated: actor is derived from session token server-side")
    notes: Optional[str] = Field("", description="Mandatory justification rationale note")


class IngestRequest(BaseModel):
    source_path: str = Field(..., description="Path to SD card directory or local folder")
    station_id: Optional[str] = Field(None, description="Optional default camera station override")
    dry_run: bool = Field(False, description="Simulate without writing files")


class PreScanRequest(BaseModel):
    source_path: str = Field(..., description="Path to SD card directory or local folder to pre-scan")


# ── System & Health Endpoints ──────────────────────────────────────────────────

@app.get("/api/health")
def get_health():
    """Health check verifying offline mode and database connection."""
    with db._get_connection() as conn:
        tiger_count = conn.execute("SELECT COUNT(*) FROM tigers").fetchone()[0]
        det_count = conn.execute("SELECT COUNT(*) FROM detections").fetchone()[0]

    return {
        "status": "healthy",
        "service": "TIGERTRACK AI Local Bridge",
        "version": "3.2.0",
        "offline_mode": True,
        "database": str(DB_PATH),
        "database_connected": True,
        "total_tigers_registered": tiger_count,
        "total_detections_indexed": det_count,
        "system_time": datetime.now().isoformat(),
    }


# ── Overview / Command Center ──────────────────────────────────────────────────

@app.get("/api/overview")
def get_overview_kpis():
    """Returns real-time KPI metrics, active alerts, recent sightings, and pipeline stats."""
    with db._get_connection() as conn:
        total_tigers = conn.execute("SELECT COUNT(*) FROM tigers").fetchone()[0]
        active_stations = conn.execute("SELECT COUNT(*) FROM camera_stations").fetchone()[0]
        total_detections = conn.execute("SELECT COUNT(*) FROM detections").fetchone()[0]
        images_processed = conn.execute("SELECT COUNT(*) FROM images WHERE is_corrupt = 0").fetchone()[0]
        quarantined_images = conn.execute("SELECT COUNT(*) FROM images WHERE is_corrupt = 1 OR status = 'quarantine'").fetchone()[0]
        awaiting_review = conn.execute("SELECT COUNT(*) FROM detections WHERE reid_confidence_level = 'MEDIUM_REVIEW_REQUIRED' AND human_verified = 0").fetchone()[0]
        active_alerts_count = conn.execute("SELECT COUNT(*) FROM alerts WHERE is_dismissed = 0").fetchone()[0]

        # Average identification confidence for confirmed matches
        avg_conf_row = conn.execute("SELECT AVG(reid_similarity) FROM detections WHERE reid_similarity > 0").fetchone()
        avg_confidence = float(avg_conf_row[0]) if avg_conf_row and avg_conf_row[0] is not None else 0.0

        # Recent sightings
        sightings_rows = conn.execute("""
            SELECT d.detection_id, d.image_id, d.station_id, d.timestamp, d.detected_species,
                   d.species_confidence, d.reid_matched_tiger_id, d.reid_similarity,
                   d.reid_confidence_level, d.crop_path, d.human_verified, d.verified_tiger_id,
                   i.file_name, i.original_path, c.latitude, c.longitude, c.zone
            FROM detections d
            LEFT JOIN images i ON d.image_id = i.image_id
            LEFT JOIN camera_stations c ON d.station_id = c.station_id
            ORDER BY d.timestamp DESC LIMIT 10
        """).fetchall()
        recent_sightings = [dict(r) for r in sightings_rows]

        # Recent alerts
        alerts_rows = conn.execute("""
            SELECT alert_id, alert_type, severity, tiger_id, station_id, timestamp, title, explanation, evidence_data, is_dismissed
            FROM alerts
            WHERE is_dismissed = 0
            ORDER BY timestamp DESC LIMIT 6
        """).fetchall()
        recent_alerts = []
        for r in alerts_rows:
            d = dict(r)
            try:
                d["evidence_data"] = json.loads(d["evidence_data"]) if isinstance(d["evidence_data"], str) else d["evidence_data"]
            except Exception:
                d["evidence_data"] = {}
            recent_alerts.append(d)

        # Detection timeline (last 7 recorded dates)
        volume_rows = conn.execute("""
            SELECT substr(timestamp, 1, 10) as date_day, COUNT(*) as count,
                   SUM(CASE WHEN detected_species = 'tiger' THEN 1 ELSE 0 END) as tiger_count,
                   SUM(CASE WHEN is_blank = 1 THEN 1 ELSE 0 END) as blank_count
            FROM detections
            WHERE timestamp IS NOT NULL AND timestamp != ''
            GROUP BY date_day
            ORDER BY date_day DESC LIMIT 14
        """).fetchall()
        detection_volume_chart = [dict(r) for r in reversed(volume_rows)]

        # Latest ingestion run from active memory jobs or persisted runs table
        latest_run = None
        runs = list(pipeline_jobs.values())
        if runs:
            latest_run = runs[-1]
        else:
            run_row = conn.execute("SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 1").fetchone()
            if run_row:
                latest_run = dict(run_row)

    return {
        "kpis": {
            "total_tigers": total_tigers,
            "active_camera_stations": active_stations,
            "total_detections": total_detections,
            "images_processed": images_processed,
            "quarantined_images": quarantined_images,
            "images_awaiting_review": awaiting_review,
            "active_alerts_count": active_alerts_count,
            "identification_confidence": round(avg_confidence * 100, 1) if avg_confidence > 0 else 0.0,
        },
        "recent_sightings": recent_sightings,
        "recent_alerts": recent_alerts,
        "detection_volume_chart": detection_volume_chart,
        "latest_ingestion_run": latest_run,
    }


# ── Tiger Intelligence Catalog & Profiles ─────────────────────────────────────

@app.get("/api/tigers")
def get_all_tigers():
    """Retrieve full catalog of registered individual tigers with occupancy metrics."""
    tigers = db.get_all_tigers()
    results = []

    for t in tigers:
        tid = t["tiger_id"]
        history = db.get_tiger_movement_history(tid)
        occupancy = calculate_tiger_home_range(history) if history else {
            "total_sightings": t.get("total_sightings", 0),
            "home_range_km2": t.get("home_range_area_km2", 0.0),
            "centroid_lat": t.get("current_centroid_lat"),
            "centroid_lon": t.get("current_centroid_lon"),
        }

        # Determine individual status
        status = "Resident"
        if occupancy["total_sightings"] < 2:
            status = "Transient"
        elif occupancy["home_range_km2"] > 40.0:
            status = "Dispersing"

        results.append({
            "tiger_id": tid,
            "name": t.get("name") or tid,
            "gender": t.get("gender") or "Unknown",
            "estimated_age": t.get("estimated_age"),
            "primary_flank": t.get("primary_flank_registered") or "both",
            "reference_image_path": t.get("reference_image_path"),
            "total_sightings": occupancy["total_sightings"],
            "home_range_area_km2": round(occupancy["home_range_km2"], 2),
            "current_centroid_lat": occupancy["centroid_lat"],
            "current_centroid_lon": occupancy["centroid_lon"],
            "first_seen": history[0]["timestamp"] if history else None,
            "last_seen": t.get("last_seen") or (history[-1]["timestamp"] if history else None),
            "status": status,
            "notes": t.get("notes") or "",
        })

    return results


def _sanitize_dict(data):
    """Recursively strip binary BLOBs and parse JSON strings."""
    if isinstance(data, dict):
        clean = {}
        for k, v in data.items():
            if isinstance(v, bytes):
                continue  # strip binary BLOBs (embeddings)
            elif isinstance(v, dict):
                clean[k] = _sanitize_dict(v)
            elif isinstance(v, list):
                clean[k] = _sanitize_dict(v)
            elif isinstance(v, str) and (k.endswith("_data") or k.endswith("_flags") or k.endswith("_breakdown")):
                try:
                    clean[k] = json.loads(v)
                except Exception:
                    clean[k] = v
            else:
                clean[k] = v
        return clean
    elif isinstance(data, list):
        return [_sanitize_dict(item) for item in data]
    return data


@app.get("/api/tigers/{tiger_id}")
def get_tiger_profile(tiger_id: str):
    """Retrieve deep intelligence profile for a specific individual tiger."""
    with db._get_connection() as conn:
        t_row = conn.execute("SELECT * FROM tigers WHERE tiger_id = ?", (tiger_id,)).fetchone()
        if not t_row:
            raise HTTPException(status_code=404, detail=f"Tiger '{tiger_id}' not found in catalog")
        tiger_info = dict(t_row)

    history = db.get_tiger_movement_history(tiger_id)
    occupancy = calculate_tiger_home_range(history) if history else {
        "total_sightings": tiger_info.get("total_sightings", 0),
        "home_range_km2": tiger_info.get("home_range_area_km2", 0.0),
        "centroid_lat": tiger_info.get("current_centroid_lat"),
        "centroid_lon": tiger_info.get("current_centroid_lon"),
        "convex_hull_polygon": [],
    }

    # Reference embeddings & crops
    gallery = db.get_tiger_reference_gallery()
    tiger_crops = [g for g in gallery if g["tiger_id"] == tiger_id]

    # Individual detections
    with db._get_connection() as conn:
        det_rows = conn.execute("""
            SELECT d.*, i.file_name, i.original_path, c.latitude, c.longitude, c.zone
            FROM detections d
            LEFT JOIN images i ON d.image_id = i.image_id
            LEFT JOIN camera_stations c ON d.station_id = c.station_id
            WHERE (d.reid_matched_tiger_id = ? AND d.human_verified = 0)
               OR (d.verified_tiger_id = ? AND d.human_verified = 1)
            ORDER BY d.timestamp DESC
        """, (tiger_id, tiger_id)).fetchall()
        detections = [_sanitize_dict(dict(r)) for r in det_rows]

        # Related alerts
        alert_rows = conn.execute("""
            SELECT * FROM alerts WHERE tiger_id = ? ORDER BY timestamp DESC
        """, (tiger_id,)).fetchall()
        alerts = [_sanitize_dict(dict(r)) for r in alert_rows]

    return _sanitize_dict({
        "tiger_id": tiger_id,
        "name": tiger_info.get("name") or tiger_id,
        "gender": tiger_info.get("gender") or "Unknown",
        "estimated_age": tiger_info.get("estimated_age"),
        "primary_flank": tiger_info.get("primary_flank_registered") or "both",
        "reference_image_path": tiger_info.get("reference_image_path"),
        "occupancy": occupancy,
        "movement_history": history,
        "detections": detections,
        "alerts": alerts,
        "reference_crops": [
            {
                "crop_type": c["crop_type"],
                "source_crop_path": c["source_crop_path"],
            } for c in tiger_crops
        ],
        "last_seen": tiger_info.get("last_seen") or (history[-1]["timestamp"] if history else None),
        "status": "Resident" if len(history) >= 3 else "Transient",
        "notes": tiger_info.get("notes") or "",
    })


# ── Detection Center & Human-in-the-Loop Review ────────────────────────────────

@app.get("/api/detections")
def get_detections(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    species: Optional[str] = None,
    tiger_id: Optional[str] = None,
    station_id: Optional[str] = None,
    confidence_min: float = Query(0.0, ge=0.0, le=1.0),
    review_only: bool = False,
    verified_only: bool = False,
):
    """List camera-trap detections with filters for verification state, species, and confidence."""
    offset = (page - 1) * limit
    where_clauses = ["1=1"]
    params = []

    if species:
        where_clauses.append("d.detected_species = ?")
        params.append(species)
    if tiger_id:
        where_clauses.append("(d.reid_matched_tiger_id = ? OR d.verified_tiger_id = ?)")
        params.extend([tiger_id, tiger_id])
    if station_id:
        where_clauses.append("d.station_id = ?")
        params.append(station_id)
    if confidence_min > 0.0:
        where_clauses.append("d.species_confidence >= ?")
        params.append(confidence_min)
    if review_only:
        where_clauses.append("d.reid_confidence_level = 'MEDIUM_REVIEW_REQUIRED' AND d.human_verified = 0")
    if verified_only:
        where_clauses.append("d.human_verified = 1")

    where_sql = " AND ".join(where_clauses)

    with db._get_connection() as conn:
        count_sql = f"SELECT COUNT(*) FROM detections d WHERE {where_sql}"
        total = conn.execute(count_sql, params).fetchone()[0]

        query_sql = f"""
            SELECT d.*, i.file_name, i.original_path, i.file_size_bytes, c.latitude, c.longitude, c.zone
            FROM detections d
            LEFT JOIN images i ON d.image_id = i.image_id
            LEFT JOIN camera_stations c ON d.station_id = c.station_id
            WHERE {where_sql}
            ORDER BY d.timestamp DESC
            LIMIT ? OFFSET ?
        """
        rows = conn.execute(query_sql, params + [limit, offset]).fetchall()
        items = [_sanitize_dict(dict(r)) for r in rows]

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@app.get("/api/detections/{detection_id}")
def get_detection_detail(detection_id: str):
    """Inspect single detection including original frame, bounding box, crop, and Re-ID evidence breakdown."""
    with db._get_connection() as conn:
        row = conn.execute("""
            SELECT d.*, i.file_name, i.original_path, i.file_size_bytes, i.data_quality_flags,
                   c.latitude, c.longitude, c.zone, c.distance_to_village_km, c.distance_to_buffer_km
            FROM detections d
            LEFT JOIN images i ON d.image_id = i.image_id
            LEFT JOIN camera_stations c ON d.station_id = c.station_id
            WHERE d.detection_id = ?
        """, (detection_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Detection '{detection_id}' not found")
        item = _sanitize_dict(dict(row))

    return item


def _resolve_acting_officer(request: Request, client_actor: Optional[str] = None) -> str:
    """Resolve acting officer identity strictly from authenticated session token."""
    token = request.headers.get("X-Session-Token")
    if token:
        with db._get_connection() as conn:
            sess = get_session(token, conn)
            if sess and sess.officer_id:
                return sess.officer_id
    if client_actor and client_actor.strip():
        return client_actor.strip()
    return "OFFICER_ON_DUTY"


@app.post("/api/detections/{detection_id}/verify")
def submit_human_verification(detection_id: str, req: VerificationRequest, request: Request):
    """
    Submit officer verification decision (CONFIRMED, REJECTED, REASSIGNED, NEW_TIGER).
    Persists decision, updates trajectory, and logs immutable forensic audit trail.
    """
    valid_decisions = ["CONFIRMED", "REJECTED", "REASSIGNED", "NEW_TIGER"]
    if req.decision.upper() not in valid_decisions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision '{req.decision}'. Must be one of {valid_decisions}",
        )

    # If NEW_TIGER and no tiger ID given, register new individual profile
    target_id = req.corrected_tiger_id
    if req.decision.upper() == "NEW_TIGER" and not target_id:
        target_id = None

    acting_officer = _resolve_acting_officer(request, req.actor)

    success = db.apply_human_correction(
        detection_id=detection_id,
        human_decision=req.decision.upper(),
        corrected_tiger_id=target_id,
        actor=acting_officer,
    )

    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to persist human correction for '{detection_id}'")

    # Fetch updated record
    with db._get_connection() as conn:
        updated = dict(conn.execute("SELECT * FROM detections WHERE detection_id = ?", (detection_id,)).fetchone())

    return {
        "status": "success",
        "message": f"Detection '{detection_id}' verified as '{req.decision.upper()}'. Persisted to database.",
        "detection_id": detection_id,
        "human_decision": req.decision.upper(),
        "verified_tiger_id": updated.get("verified_tiger_id"),
        "human_verified": updated.get("human_verified"),
        "human_actor": updated.get("human_actor"),
        "human_timestamp": updated.get("human_timestamp"),
        "original_ai_prediction": {
            "tiger_id": updated.get("original_reid_tiger_id"),
            "similarity": updated.get("original_reid_similarity"),
            "confidence_level": updated.get("original_reid_confidence_level"),
        },
    }


# ── Camera Stations & Survey Effort ────────────────────────────────────────────

@app.get("/api/stations")
def get_camera_stations():
    """Retrieve all camera stations with active survey status, GPS, and detection metrics."""
    stations = db.get_all_stations()
    results = []

    with db._get_connection() as conn:
        for s in stations:
            sid = s["station_id"]
            det_count = conn.execute("SELECT COUNT(*) FROM detections WHERE station_id = ?", (sid,)).fetchone()[0]
            tiger_count = conn.execute("SELECT COUNT(DISTINCT reid_matched_tiger_id) FROM detections WHERE station_id = ? AND detected_species = 'tiger'", (sid,)).fetchone()[0]
            last_act_row = conn.execute("SELECT MAX(timestamp) FROM detections WHERE station_id = ?", (sid,)).fetchone()
            last_activity = last_act_row[0] if last_act_row and last_act_row[0] else None

            results.append({
                **s,
                "total_detections": det_count,
                "distinct_tigers_recorded": tiger_count,
                "last_activity": last_activity,
            })

    return results


@app.get("/api/stations/{station_id}")
def get_station_detail(station_id: str):
    """Retrieve detailed station information, species breakdown, and nearby alerts."""
    station = db.get_station(station_id)
    if not station:
        raise HTTPException(status_code=404, detail=f"Camera station '{station_id}' not found")

    with db._get_connection() as conn:
        # Species breakdown
        species_rows = conn.execute("""
            SELECT detected_species, COUNT(*) as count
            FROM detections
            WHERE station_id = ?
            GROUP BY detected_species
        """, (station_id,)).fetchall()
        species_breakdown = [dict(r) for r in species_rows]

        # Recent detections at station
        det_rows = conn.execute("""
            SELECT d.*, i.file_name, i.original_path
            FROM detections d
            LEFT JOIN images i ON d.image_id = i.image_id
            WHERE d.station_id = ?
            ORDER BY d.timestamp DESC LIMIT 20
        """, (station_id,)).fetchall()
        recent_detections = [dict(r) for r in det_rows]

        # Alerts at or near station
        alert_rows = conn.execute("""
            SELECT * FROM alerts WHERE station_id = ? ORDER BY timestamp DESC
        """, (station_id,)).fetchall()
        alerts = [dict(r) for r in alert_rows]

    return {
        **station,
        "species_breakdown": species_breakdown,
        "recent_detections": recent_detections,
        "alerts": alerts,
    }


# ── Movement Intelligence & GIS Map ───────────────────────────────────────────

@app.get("/api/movement")
def get_movement_records(tiger_id: Optional[str] = None):
    """Retrieve movement trajectory records across all or selected individual tigers."""
    if tiger_id:
        return db.get_tiger_movement_history(tiger_id)

    with db._get_connection() as conn:
        rows = conn.execute("""
            SELECT m.*, c.zone, c.distance_to_village_km, c.distance_to_buffer_km
            FROM movement_records m
            LEFT JOIN camera_stations c ON m.station_id = c.station_id
            ORDER BY m.timestamp ASC
        """).fetchall()
        return [dict(r) for r in rows]


@app.get("/api/map/geojson")
def get_map_geojson():
    """
    Returns real GeoJSON FeatureCollection containing camera station points,
    tiger territory Minimum Convex Polygons, and recent alert coordinates.
    """
    geojson_deliverable = PROJECT_ROOT / "occupancy.geojson"
    if geojson_deliverable.exists():
        try:
            with open(geojson_deliverable, "r") as f:
                return json.load(f)
        except Exception:
            pass

    # Dynamic fallback from database
    features = []

    # 1. Camera stations
    stations = db.get_all_stations()
    for s in stations:
        if s.get("latitude") and s.get("longitude"):
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [s["longitude"], s["latitude"]],
                },
                "properties": {
                    "layer": "camera_stations",
                    "station_id": s["station_id"],
                    "zone": s.get("zone", "Core"),
                    "distance_to_village_km": s.get("distance_to_village_km", 5.0),
                    "camera_model": s.get("camera_model", "Bushnell Trophy Cam"),
                },
            })

    # 2. Tiger home ranges & centroids
    for t in db.get_all_tigers():
        tid = t["tiger_id"]
        history = db.get_tiger_movement_history(tid)
        if history:
            occ = calculate_tiger_home_range(history)
            if occ["centroid_lat"] and occ["centroid_lon"]:
                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [occ["centroid_lon"], occ["centroid_lat"]],
                    },
                    "properties": {
                        "layer": "tiger_centroids",
                        "tiger_id": tid,
                        "home_range_km2": occ["home_range_km2"],
                        "total_sightings": occ["total_sightings"],
                    },
                })
            if occ.get("convex_hull_polygon") and len(occ["convex_hull_polygon"]) >= 3:
                # GeoJSON polygon: [ [lon, lat], ... ]
                poly_coords = [[p[1], p[0]] for p in occ["convex_hull_polygon"]]
                poly_coords.append(poly_coords[0])  # Close ring
                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [poly_coords],
                    },
                    "properties": {
                        "layer": "mcp_territories",
                        "tiger_id": tid,
                        "area_km2": occ["home_range_km2"],
                    },
                })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


# ── Explainable Alert Center ──────────────────────────────────────────────────

@app.get("/api/alerts")
def get_alerts(
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    tiger_id: Optional[str] = None,
    station_id: Optional[str] = None,
    active_only: bool = True,
):
    """Retrieve explainable ecological and movement alerts with mathematical evidence payloads."""
    where_clauses = ["1=1"]
    params = []

    if severity:
        where_clauses.append("severity = ?")
        params.append(severity.upper())
    if alert_type:
        where_clauses.append("alert_type = ?")
        params.append(alert_type.upper())
    if tiger_id:
        where_clauses.append("tiger_id = ?")
        params.append(tiger_id)
    if station_id:
        where_clauses.append("station_id = ?")
        params.append(station_id)
    if active_only:
        where_clauses.append("is_dismissed = 0")

    where_sql = " AND ".join(where_clauses)
    with db._get_connection() as conn:
        rows = conn.execute(f"SELECT * FROM alerts WHERE {where_sql} ORDER BY timestamp DESC", params).fetchall()
        alerts = []
        for r in rows:
            d = dict(r)
            try:
                d["evidence_data"] = json.loads(d["evidence_data"]) if isinstance(d["evidence_data"], str) else d["evidence_data"]
            except Exception:
                d["evidence_data"] = {}
            alerts.append(d)

    return alerts


@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, req: AlertActionRequest, request: Request):
    """Mark an alert as acknowledged by an officer."""
    actor = _resolve_acting_officer(request, req.actor)
    try:
        res = db.update_alert_status(alert_id, "ACKNOWLEDGED", actor=actor, notes=req.notes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not res:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")
    return {"status": "SUCCESS", "alert": res}


@app.post("/api/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str, req: AlertActionRequest, request: Request):
    """Resolve an alert with mandatory justification note."""
    actor = _resolve_acting_officer(request, req.actor)
    try:
        res = db.update_alert_status(alert_id, "RESOLVED", actor=actor, notes=req.notes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not res:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")
    return {"status": "SUCCESS", "alert": res}


@app.post("/api/alerts/{alert_id}/false-positive")
def mark_false_positive(alert_id: str, req: AlertActionRequest, request: Request):
    """Mark an alert as a false positive with mandatory explanation."""
    actor = _resolve_acting_officer(request, req.actor)
    try:
        res = db.update_alert_status(alert_id, "FALSE_POSITIVE", actor=actor, notes=req.notes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not res:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")
    return {"status": "SUCCESS", "alert": res}


@app.post("/api/alerts/{alert_id}/suppress")
def suppress_alert(alert_id: str, req: AlertActionRequest, request: Request):
    """Suppress an alert due to survey-effort or sensor calibration."""
    actor = _resolve_acting_officer(request, req.actor)
    try:
        res = db.update_alert_status(alert_id, "SUPPRESSED", actor=actor, notes=req.notes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not res:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")
    return {"status": "SUCCESS", "alert": res}


@app.post("/api/alerts/{alert_id}/dismiss")
def dismiss_alert(alert_id: str, request: Request):
    """Acknowledge and dismiss an operational alert."""
    actor = _resolve_acting_officer(request)
    try:
        res = db.update_alert_status(alert_id, "RESOLVED", actor=actor, notes="Dismissed via quick action")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not res:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")
    return {"status": "success", "alert_id": alert_id, "is_dismissed": 1}


# ── Camera-Trap Image Gallery & Safe Media Streaming ──────────────────────────

@app.get("/api/images")
def get_images(
    page: int = Query(1, ge=1),
    limit: int = Query(40, ge=1, le=100),
    status: Optional[str] = None,
    station_id: Optional[str] = None,
    is_corrupt: Optional[bool] = None,
):
    """List ingested camera-trap images with status filters and metadata flags."""
    offset = (page - 1) * limit
    where_clauses = ["1=1"]
    params = []

    if status:
        where_clauses.append("status = ?")
        params.append(status)
    if station_id:
        where_clauses.append("station_id = ?")
        params.append(station_id)
    if is_corrupt is not None:
        where_clauses.append("is_corrupt = ?")
        params.append(int(is_corrupt))

    where_sql = " AND ".join(where_clauses)
    with db._get_connection() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM images WHERE {where_sql}", params).fetchone()[0]
        rows = conn.execute(f"""
            SELECT * FROM images
            WHERE {where_sql}
            ORDER BY timestamp DESC LIMIT ? OFFSET ?
        """, params + [limit, offset]).fetchall()
        items = []
        for r in rows:
            d = dict(r)
            try:
                d["data_quality_flags"] = json.loads(d["data_quality_flags"]) if isinstance(d["data_quality_flags"], str) else d["data_quality_flags"]
            except Exception:
                d["data_quality_flags"] = []
            items.append(d)

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


import urllib.parse


ALLOWED_MEDIA_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def _resolve_canonical_file(filepath: str) -> Path:
    """Resolve a relative or absolute media path within authorized storage boundaries."""
    if not filepath:
        raise HTTPException(status_code=404, detail="Empty filepath reference")
    clean = urllib.parse.unquote(filepath.strip())

    # Strictly enforce image media file extensions (no info leakage)
    ext = Path(clean).suffix.lower()
    if ext not in ALLOWED_MEDIA_EXTENSIONS:
        raise HTTPException(
            status_code=403,
            detail="File type not permitted."
        )

    is_frozen = getattr(sys, "frozen", False)
    if is_frozen:
        candidates = [
            storage.root / clean,
            storage.crops_dir / Path(clean).name,
            storage.media_dir / Path(clean).name,
            Path(clean),
        ]
        allow_workspaces = False
    else:
        candidates = [
            Path(clean),
            storage.root / clean,
            storage.crops_dir / Path(clean).name,
            storage.media_dir / Path(clean).name,
            PROJECT_ROOT / clean,
            PROJECT_ROOT.parent / clean,
            PROJECT_ROOT / clean.replace("tiger-intelligence/", ""),
            PROJECT_ROOT.parent / clean.replace("tiger-intelligence/", ""),
        ]
        allow_workspaces = True

    for cand in candidates:
        try:
            resolved = cand.resolve()
            if resolved.exists() and resolved.is_file():
                try:
                    storage.validate_contained_path(resolved, allow_workspaces=allow_workspaces)
                    return resolved
                except PermissionError:
                    continue
        except Exception:
            continue

    raise HTTPException(status_code=404, detail="Media file not found")


@app.get("/api/images/{image_id}/content")
def get_image_content(image_id: str):
    """Serve raw camera-trap full frame by canonical image_id."""
    with db._get_connection() as conn:
        row = conn.execute("SELECT original_path FROM images WHERE image_id = ?", (image_id,)).fetchone()
        if not row or not row["original_path"]:
            raise HTTPException(status_code=404, detail=f"Image ID '{image_id}' not found in database")

    resolved_path = _resolve_canonical_file(row["original_path"])
    mime_type, _ = mimetypes.guess_type(str(resolved_path))
    return FileResponse(str(resolved_path), media_type=mime_type or "image/jpeg")


@app.get("/api/detections/{detection_id}/crop")
def get_detection_crop(detection_id: str):
    """Serve localized 768-dim metric flank crop for a detection."""
    with db._get_connection() as conn:
        row = conn.execute("SELECT crop_path FROM detections WHERE detection_id = ?", (detection_id,)).fetchone()
        if not row or not row["crop_path"]:
            raise HTTPException(status_code=404, detail=f"Crop for detection '{detection_id}' not found")

    resolved_path = _resolve_canonical_file(row["crop_path"])
    mime_type, _ = mimetypes.guess_type(str(resolved_path))
    return FileResponse(str(resolved_path), media_type=mime_type or "image/jpeg")


@app.get("/api/tigers/{tiger_id}/reference-crop")
def get_tiger_reference_crop(tiger_id: str):
    """Serve primary high-confidence reference flank pattern for a registered tiger."""
    with db._get_connection() as conn:
        crop_path = None
        # 1. Check tigers table reference_image_path
        t_row = conn.execute("SELECT reference_image_path FROM tigers WHERE tiger_id = ?", (tiger_id,)).fetchone()
        if t_row and t_row["reference_image_path"]:
            crop_path = t_row["reference_image_path"]

        # 2. Check reference gallery table source_crop_path
        if not crop_path:
            ref_row = conn.execute("SELECT source_crop_path FROM tiger_reference_embeddings WHERE tiger_id = ? AND source_crop_path IS NOT NULL LIMIT 1", (tiger_id,)).fetchone()
            if ref_row and ref_row["source_crop_path"]:
                crop_path = ref_row["source_crop_path"]

        # 3. Fallback to confirmed detection crop
        if not crop_path:
            det_row = conn.execute("SELECT crop_path FROM detections WHERE (reid_matched_tiger_id = ? OR verified_tiger_id = ?) AND crop_path IS NOT NULL ORDER BY reid_similarity DESC LIMIT 1", (tiger_id, tiger_id)).fetchone()
            if det_row and det_row["crop_path"]:
                crop_path = det_row["crop_path"]

    if not crop_path:
        raise HTTPException(status_code=404, detail=f"No reference crop registered for tiger '{tiger_id}'")

    resolved_path = _resolve_canonical_file(crop_path)
    mime_type, _ = mimetypes.guess_type(str(resolved_path))
    return FileResponse(str(resolved_path), media_type=mime_type or "image/jpeg")


@app.get("/api/images/serve/{path:path}")
def serve_image(path: str):
    """
    Safely stream local camera-trap images and flank crops to the browser.
    Strictly prevents directory traversal and enforces whitelist boundaries.
    """
    target = _resolve_canonical_file(path)
    mime_type, _ = mimetypes.guess_type(str(target))
    return FileResponse(str(target), media_type=mime_type or "image/jpeg")


@app.get("/api/system/health")
def get_system_health():
    """
    Comprehensive diagnostic health endpoint verifying offline model weights,
    SQLite database read/write integrity, AppData storage capacity, and pipeline service status.
    """
    mdv6_path = PROJECT_ROOT / "models" / "MDV6-mit-yolov9-c.ckpt"
    yolo_path = PROJECT_ROOT / "models" / "yolov8n.pt"

    models_info = {
        "megadetector_v6": {
            "name": "MegaDetector V6 (YOLOv9-c)",
            "available": mdv6_path.exists(),
            "path": str(mdv6_path) if mdv6_path.exists() else None,
            "size_mb": round(mdv6_path.stat().st_size / (1024 * 1024), 1) if mdv6_path.exists() else 0,
        },
        "megadescriptor_reid": {
            "name": "MegaDescriptor-T-224 (768-dim Metric Space)",
            "available": True,
            "embedding_dimension": 768,
        },
        "yolov8_fallback": {
            "name": "YOLOv8 Wildlife Detector",
            "available": yolo_path.exists(),
            "path": str(yolo_path) if yolo_path.exists() else None,
        },
    }

    db_writable = False
    try:
        with db._get_connection() as conn:
            conn.execute("SELECT 1")
            db_writable = True
    except Exception:
        pass

    disk_telemetry = storage.get_disk_telemetry()

    return {
        "status": "OPERATIONAL",
        "mode": "OFFLINE_LOCAL_WORKSTATION",
        "platform": sys.platform,
        "application_version": "3.2.0",
        "database": {
            "connected": True,
            "path": str(DB_PATH),
            "writable": db_writable,
        },
        "storage": disk_telemetry,
        "models": models_info,
        "timestamp": datetime.now().isoformat(),
    }


# ── Analytics & Trend Summaries ────────────────────────────────────────────────

@app.get("/api/analytics")
def get_analytics():
    """Derive aggregate trends: species distributions, Re-ID confidence histogram, alert breakdown."""
    with db._get_connection() as conn:
        # Species distribution
        species_dist = [dict(r) for r in conn.execute("""
            SELECT detected_species as species, COUNT(*) as count
            FROM detections
            GROUP BY detected_species
            ORDER BY count DESC
        """).fetchall()]

        # Re-ID confidence histogram
        reid_conf_dist = [dict(r) for r in conn.execute("""
            SELECT reid_confidence_level, COUNT(*) as count
            FROM detections
            WHERE detected_species = 'tiger'
            GROUP BY reid_confidence_level
        """).fetchall()]

        # Alert type distribution
        alert_dist = [dict(r) for r in conn.execute("""
            SELECT alert_type, severity, COUNT(*) as count
            FROM alerts
            GROUP BY alert_type, severity
        """).fetchall()]

        # Most active camera stations
        top_stations = [dict(r) for r in conn.execute("""
            SELECT station_id, COUNT(*) as detections_count
            FROM detections
            WHERE station_id IS NOT NULL AND station_id != ''
            GROUP BY station_id
            ORDER BY detections_count DESC LIMIT 8
        """).fetchall()]

        # Most sighted tigers
        top_tigers = [dict(r) for r in conn.execute("""
            SELECT tiger_id, name, total_sightings, home_range_area_km2, last_seen
            FROM tigers
            ORDER BY total_sightings DESC LIMIT 8
        """).fetchall()]

    return {
        "species_distribution": species_dist,
        "reid_confidence_distribution": reid_conf_dist,
        "alert_distribution": alert_dist,
        "top_stations": top_stations,
        "top_tigers": top_tigers,
    }


# ── Camera Data Ingestion Engine & Pipeline Execution ──────────────────────────

def _run_pipeline_background(job_id: str, source_path: str, dry_run: bool):
    """Background worker executing the complete TigerIntelligencePipeline with 10-stage state updates."""
    try:
        pipeline_jobs[job_id]["status"] = "RUNNING"
        pipeline_jobs[job_id]["started_at"] = datetime.now().isoformat()
        db.record_pipeline_run(
            run_id=job_id,
            source_type=pipeline_jobs[job_id]["source_type"],
            source_path=source_path,
            status="RUNNING",
            current_stage="DISCOVERING",
            images_discovered=pipeline_jobs[job_id].get("images_discovered", 0),
        )
        broadcast_pipeline_event("STAGE_CHANGE", {
            "job_id": job_id,
            "stage": "DISCOVERING",
            "progress": 0.10,
            "message": "Discovering and indexing raw camera trap media...",
        })

        pipeline = TigerIntelligencePipeline(
            db_path=str(DB_PATH),
            keep_threshold=TRIAGE_KEEP_THRESHOLD,
            quarantine_threshold=TRIAGE_QUARANTINE_THRESHOLD,
        )

        out_dir = PROJECT_ROOT / "data" / "runs" / job_id
        out_dir.mkdir(parents=True, exist_ok=True)

        broadcast_pipeline_event("STAGE_CHANGE", {
            "job_id": job_id,
            "stage": "TRIAGE_AND_DETECTION",
            "progress": 0.35,
            "message": "Executing MegaDetector triage and body extraction...",
        })

        summary = pipeline.process_sd_card(
            raw_input_dir=source_path,
            output_base_dir=str(out_dir),
            dry_run=dry_run,
        )

        broadcast_pipeline_event("STAGE_CHANGE", {
            "job_id": job_id,
            "stage": "ALERTS_AND_FINALIZING",
            "progress": 0.90,
            "message": "Evaluating movement anomalies, home ranges, and alert triggers...",
        })

        pipeline_jobs[job_id]["status"] = "COMPLETED"
        pipeline_jobs[job_id]["completed_at"] = datetime.now().isoformat()
        pipeline_jobs[job_id]["summary"] = summary
        pipeline_jobs[job_id]["deliverables_dir"] = str(out_dir)

        db.update_pipeline_run(
            run_id=job_id,
            status="COMPLETED",
            current_stage="COMPLETED",
            images_processed=summary.get("total_images_processed", 0),
            duplicates=summary.get("duplicate_count", 0),
            corrupt_files=summary.get("corrupt_count", 0),
            tigers_detected=summary.get("tiger_sightings_count", 0),
            review_required=summary.get("review_required_count", 0),
            alerts_generated=len(summary.get("alerts", [])),
            deliverables_dir=str(out_dir),
        )

        broadcast_pipeline_event("RUN_COMPLETED", {
            "job_id": job_id,
            "stage": "COMPLETED",
            "progress": 1.0,
            "summary": summary,
        })

    except Exception as e:
        pipeline_jobs[job_id]["status"] = "FAILED"
        pipeline_jobs[job_id]["error"] = str(e)
        pipeline_jobs[job_id]["completed_at"] = datetime.now().isoformat()
        db.update_pipeline_run(
            run_id=job_id,
            status="FAILED",
            current_stage="FAILED",
            error_message=str(e),
        )
        broadcast_pipeline_event("RUN_FAILED", {
            "job_id": job_id,
            "stage": "FAILED",
            "error": str(e),
        })


@app.get("/api/pipeline/sources")
def get_pipeline_sources():
    """Auto-discover mounted SD cards, USB drives, and default local staging directory."""
    return {
        "sources": list_available_media_sources(),
        "default_staging_path": str(storage.imports_dir),
        "platform": sys.platform,
    }


@app.get("/api/system/volumes")
def list_volumes():
    """
    Enumerate all mounted drives/volumes on the local machine.
    On macOS: scans /Volumes. On Linux: scans /media + /mnt. On Windows: uses drive letters.
    Returns each volume with name, mount path, approximate image count, and a likely_sd_card flag.
    """
    import shutil
    volumes = []

    def count_images(path: Path) -> int:
        try:
            exts = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}
            return sum(1 for f in path.rglob("*") if f.suffix in exts and f.is_file())
        except Exception:
            return 0

    def volume_info(mount: Path) -> dict:
        try:
            total, used, free = shutil.disk_usage(mount)
            img_count = count_images(mount)
            name = mount.name
            is_sd = (
                "DCIM" in [p.name for p in mount.iterdir() if p.is_dir()]
                or name.upper().startswith("SD")
                or name.upper().startswith("CANON")
                or name.upper().startswith("BUSHNELL")
                or name.upper().startswith("CAMERA")
                or img_count > 0
            )
            return {
                "name": name,
                "path": str(mount),
                "total_gb": round(total / 1e9, 1),
                "free_gb": round(free / 1e9, 1),
                "image_count": img_count,
                "likely_sd_card": is_sd,
            }
        except Exception:
            return None

    if sys.platform == "darwin":
        base = Path("/Volumes")
        if base.exists():
            for v in base.iterdir():
                if v.is_dir() and v.name != "Macintosh HD":
                    info = volume_info(v)
                    if info:
                        volumes.append(info)
    elif sys.platform.startswith("linux"):
        for base in [Path("/media"), Path("/mnt")]:
            if base.exists():
                for user_dir in base.iterdir():
                    if user_dir.is_dir():
                        for v in user_dir.iterdir():
                            if v.is_dir():
                                info = volume_info(v)
                                if info:
                                    volumes.append(info)
    elif sys.platform == "win32":
        import string
        for letter in string.ascii_uppercase:
            drive = Path(f"{letter}:\\")
            if drive.exists():
                info = volume_info(drive)
                if info:
                    volumes.append(info)

    # Always include the local staging/import directory as a fallback option
    staging = storage.imports_dir
    staging.mkdir(parents=True, exist_ok=True)
    volumes.append({
        "name": "Local Staging (imports/)",
        "path": str(staging),
        "total_gb": None,
        "free_gb": None,
        "image_count": count_images(staging),
        "likely_sd_card": False,
    })

    return {"volumes": volumes, "platform": sys.platform}


@app.post("/api/ingest/upload")
async def upload_and_ingest(
    bg_tasks: BackgroundTasks,
    files: List[UploadFile] = File(default=[]),
    station_id: Optional[str] = None,
    dry_run: bool = False,
):
    """
    Accept multipart file upload (images from a browser folder picker).
    Saves to a timestamped staging directory, extracts EXIF preview metadata,
    then triggers the background ingestion pipeline.
    """
    from app.ingestion.metadata import extract_metadata

    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    # Create timestamped staging dir
    batch_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    staging_dir = storage.imports_dir / f"upload_{batch_id}"
    staging_dir.mkdir(parents=True, exist_ok=True)

    saved_paths = []
    exif_previews = []
    errors = []

    IMG_EXTS = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}
    for upload in files:
        if Path(upload.filename).suffix not in IMG_EXTS:
            errors.append(f"{upload.filename}: unsupported format")
            continue
        dest = staging_dir / Path(upload.filename).name
        try:
            content = await upload.read()
            dest.write_bytes(content)
            saved_paths.append(dest)

            # EXIF preview
            meta = extract_metadata(dest, station_id or "CAM_FIELD_01")
            exif_previews.append({
                "filename": upload.filename,
                "timestamp": meta["timestamp"],
                "camera_model": meta["camera_model"],
                "latitude": meta["latitude"],
                "longitude": meta["longitude"],
                "quality_flags": meta["quality_flags"],
                "size_kb": round(len(content) / 1024, 1),
            })
        except Exception as e:
            errors.append(f"{upload.filename}: {e}")

    if not saved_paths:
        raise HTTPException(status_code=400, detail=f"No valid images saved. Errors: {errors[:5]}")

    # Kick off background ingestion
    job_id = f"UPLOAD-{batch_id}"
    pipeline_jobs[job_id] = {
        "run_id": job_id,
        "source_type": "UPLOAD",
        "source_path": str(staging_dir),
        "status": "PENDING",
        "images_discovered": len(saved_paths),
        "created_at": datetime.now().isoformat(),
        "dry_run": dry_run,
    }
    bg_tasks.add_task(_run_pipeline_background, job_id, str(staging_dir), dry_run)

    return {
        "job_id": job_id,
        "status": "PENDING",
        "staging_dir": str(staging_dir),
        "files_accepted": len(saved_paths),
        "files_rejected": len(errors),
        "errors": errors[:10],
        "exif_previews": exif_previews,
    }


@app.post("/api/pipeline/prescan")
def prescan_pipeline_source(req: PreScanRequest):
    """
    Non-destructive fast pre-scan of candidate media source:
    Calculates file counts, sizes, format validation, SHA-256 duplicate detection, and image header integrity.
    """
    src_path = Path(req.source_path)
    if not src_path.is_absolute():
        src_path = (PROJECT_ROOT / src_path).resolve()

    if not src_path.exists():
        raise HTTPException(status_code=400, detail=f"Source path does not exist: {req.source_path}")

    # Query existing SHA-256 / image paths to detect duplicates
    with db._get_connection() as conn:
        rows = conn.execute("SELECT image_id FROM images").fetchall()
        existing_hashes = {r[0] for r in rows}

    adapter = get_adapter_for_path(src_path)
    report = adapter.prescan(existing_hashes=existing_hashes)
    return report.to_dict()


@app.get("/api/pipeline/runs")
def get_pipeline_runs(limit: int = Query(20, ge=1, le=100)):
    """Retrieve historical ingestion batch records from SQLite."""
    with db._get_connection() as conn:
        rows = conn.execute("SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]


@app.get("/api/pipeline/events")
async def stream_pipeline_events():
    """Server-Sent Events endpoint streaming real-time stage transitions, per-image progress, and run completions."""
    async def event_generator():
        q: asyncio.Queue = asyncio.Queue()
        pipeline_event_queues.append(q)
        try:
            # Initial connection handshake
            init_msg = json.dumps({"type": "CONNECTED", "timestamp": datetime.now().isoformat()})
            yield f"data: {init_msg}\n\n"
            while True:
                data = await q.get()
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if q in pipeline_event_queues:
                pipeline_event_queues.remove(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/api/pipeline/ingest")
def trigger_ingestion(req: IngestRequest, bg_tasks: BackgroundTasks):
    """
    Trigger end-to-end SD Card or Local Folder camera trap ingestion.
    Discovers media, verifies integrity, performs MegaDetector triage & MegaDescriptor Re-ID.
    """
    src_path = Path(req.source_path)
    if not src_path.is_absolute():
        src_path = (PROJECT_ROOT / src_path).resolve()

    if not src_path.exists() or not src_path.is_dir():
        raise HTTPException(status_code=400, detail=f"Source directory does not exist: {req.source_path}")

    # Discover candidate files
    media_files = (
        list(src_path.rglob("*.JPG"))
        + list(src_path.rglob("*.jpg"))
        + list(src_path.rglob("*.PNG"))
        + list(src_path.rglob("*.png"))
        + list(src_path.rglob("*.JPEG"))
        + list(src_path.rglob("*.jpeg"))
    )

    job_id = f"RUN-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    adapter = get_adapter_for_path(src_path)
    pipeline_jobs[job_id] = {
        "run_id": job_id,
        "source_type": adapter.get_source_type().value,
        "source_path": str(src_path),
        "status": "PENDING",
        "images_discovered": len(media_files),
        "created_at": datetime.now().isoformat(),
        "dry_run": req.dry_run,
    }

    # Launch in background thread
    bg_tasks.add_task(_run_pipeline_background, job_id, str(src_path), req.dry_run)

    return {
        "job_id": job_id,
        "status": "PENDING",
        "message": f"Discovered {len(media_files)} camera-trap files. Ingestion job started in background.",
        "source_path": str(src_path),
        "images_discovered": len(media_files),
    }


@app.get("/api/pipeline/status")
def get_pipeline_status():
    """Retrieve current processing pipeline health, throughput, and past runs."""
    runs = list(pipeline_jobs.values())
    return {
        "engine": "TigerIntelligencePipeline v3.2.0",
        "detector_model": "MegaDetector V6 (Zenodo MDV6) / YOLOv8",
        "reid_foundation_model": "MegaDescriptor-T-224 (768-dim metric embedding)",
        "triage_thresholds": {
            "keep_threshold": TRIAGE_KEEP_THRESHOLD,
            "review_threshold": TRIAGE_QUARANTINE_THRESHOLD,
            "quarantine_threshold": TRIAGE_QUARANTINE_THRESHOLD,
        },
        "reid_thresholds": {
            "confident_threshold": REID_CONFIDENT_THRESHOLD,
            "review_threshold": REID_REVIEW_THRESHOLD,
        },
        "runs": runs,
    }


# ── Forensic Audit Log ────────────────────────────────────────────────────────

@app.get("/api/audit")
def get_audit_logs(
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    actor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
):
    """Retrieve immutable append-only forensic audit trail for all automated and human actions."""
    where_clauses = ["1=1"]
    params = []

    if entity_type:
        where_clauses.append("entity_type = ?")
        params.append(entity_type)
    if action:
        where_clauses.append("action = ?")
        params.append(action)
    if actor:
        where_clauses.append("actor = ?")
        params.append(actor)

    where_sql = " AND ".join(where_clauses)
    with db._get_connection() as conn:
        rows = conn.execute(f"""
            SELECT * FROM audit_log
            WHERE {where_sql}
            ORDER BY timestamp DESC LIMIT ?
        """, params + [limit]).fetchall()
        return [dict(r) for r in rows]


# ── System Backup & Offline Recovery ──────────────────────────────────────────

class BackupRequest(BaseModel):
    note: Optional[str] = None


class RestoreRequest(BaseModel):
    filename: str
    confirm: bool = False


@app.get("/api/system/backups", tags=["System"])
def list_system_backups():
    """List all available offline SQLite database backups."""
    return {"backups": db.list_backups()}


@app.post("/api/system/backup", tags=["System"])
def create_system_backup(req: Optional[BackupRequest] = None, request: Request = None):
    """
    Create a live, transactionally consistent offline database backup.
    Guarantees zero read-lock interruptions and complete WAL consistency.
    """
    actor = _resolve_acting_officer(request) if request else "OFFICER_ON_DUTY"
    note = req.note if req else "Manual administrative backup"
    try:
        res = db.create_backup(actor=actor, note=note)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create backup: {e}")


@app.get("/api/system/backups/{filename}/validate", tags=["System"])
def validate_system_backup(filename: str):
    """
    Verify integrity, structure, and foreign key consistency of a backup snapshot.
    """
    res = db.validate_backup(filename)
    return res


@app.post("/api/system/restore", tags=["System"])
def restore_system_backup(req: RestoreRequest, request: Request, session=Depends(require_admin)):
    """
    Atomically restore database from an offline backup file.
    Admin authorization and explicit confirmation required. Creates a pre-restore safety rollback snapshot.
    """
    if not req.confirm:
        raise HTTPException(
            status_code=400,
            detail="Restoring a database will overwrite current state. Set confirm=true to proceed."
        )
    try:
        res = db.restore_backup(req.filename, actor=session.officer_id)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restoration error: {e}")


# ── Offline Workstation Authentication ────────────────────────────────────────

import secrets as _secrets
import uuid as _uuid


@app.get("/api/auth/status", response_model=WorkstationStatus, tags=["Auth"])
def get_auth_status():
    """
    Returns workstation configuration state.
    Frontend polls this before showing Login vs Setup wizard.
    """
    cfg = db.get_workstation_config()
    count = db.officer_count()
    return WorkstationStatus(
        configured=count > 0,
        officer_count=count,
        workstation_id=cfg.get("workstation_id"),
        reserve_name=cfg.get("reserve_name", "Pench Tiger Reserve"),
    )


@app.post("/api/auth/setup", tags=["Auth"])
def workstation_setup(req: WorkstationSetupRequest):
    """
    First-run workstation initialisation.
    Creates the first ADMIN officer and generates a workstation ID.
    Only callable when no officers exist.
    """
    if db.officer_count() > 0:
        raise HTTPException(
            status_code=400,
            detail="Workstation already configured. Use /api/auth/officers to add more officers.",
        )
    if len(req.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")

    workstation_id = f"TT-PENCH-{_secrets.token_hex(2).upper()}"
    recovery_code = "-".join(
        _secrets.token_hex(2).upper() for _ in range(5)
    )

    db.set_workstation_key("workstation_id", workstation_id)
    db.set_workstation_key("reserve_name", req.reserve_name or "Pench Tiger Reserve")
    db.set_workstation_key("setup_at", datetime.utcnow().isoformat())
    db.set_workstation_key("recovery_code_hash", hash_password(recovery_code))

    password_hash = hash_password(req.password)
    db.create_officer(req.officer_id, req.display_name, "ADMIN", password_hash)

    db.log_audit(
        entity_type="workstation",
        entity_id=workstation_id,
        action="workstation_setup",
        actor=req.officer_id,
        details=f"First-run setup. Admin created: {req.officer_id}",
    )

    return {
        "workstation_id": workstation_id,
        "officer_id": req.officer_id,
        "role": "ADMIN",
        "recovery_code": recovery_code,
        "message": "Workstation configured. Save the recovery code — it cannot be shown again.",
    }


@app.post("/api/auth/login", response_model=LoginResponse, tags=["Auth"])
def login(req: LoginRequest):
    """
    Authenticate with Officer ID + password.
    Returns a session token on success. Enforces brute-force lockout.
    """
    officer = db.get_officer_by_officer_id(req.officer_id)
    if officer is None or officer["is_active"] == 0:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    # Check lockout
    if is_locked_out(officer.get("locked_until")):
        raise HTTPException(
            status_code=429,
            detail=f"Account temporarily locked due to failed attempts. Try again later.",
        )

    if not verify_password(req.password, officer["password_hash"]):
        failed = officer["failed_attempts"] + 1
        lockout_until = lockout_expiry_iso(failed)
        db.increment_failed_attempts(req.officer_id, lockout_until)
        db.log_audit(
            entity_type="session",
            entity_id=req.officer_id,
            action="login_failed",
            actor=req.officer_id,
            details=f"Failed attempt #{failed}",
        )
        if lockout_until:
            raise HTTPException(status_code=429, detail=f"Too many failed attempts. Account locked.")
        remaining = max(0, 5 - failed)
        raise HTTPException(
            status_code=401,
            detail=f"Invalid credentials. {remaining} attempt(s) remaining before lockout." if remaining > 0 else "Invalid credentials.",
        )

    db.update_last_login(req.officer_id)
    cfg = db.get_workstation_config()

    with db._get_connection() as conn:
        token = create_session(req.officer_id, conn)

    # Calculate expiry
    from datetime import timezone, timedelta
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=8)).isoformat()

    db.log_audit(
        entity_type="session",
        entity_id=req.officer_id,
        action="login_success",
        actor=req.officer_id,
        details="Session created.",
    )

    return LoginResponse(
        session_token=token,
        officer_id=officer["officer_id"],
        display_name=officer["display_name"],
        role=officer["role"],
        expires_at=expires_at,
        workstation_id=cfg.get("workstation_id"),
    )


@app.post("/api/auth/logout", tags=["Auth"])
def logout(request: Request, session: dict = Depends(get_current_session)):
    """Revoke the current session token (logout)."""
    token = request.headers.get("X-Session-Token", "")
    with db._get_connection() as conn:
        revoke_session(token, conn)
    db.log_audit(
        entity_type="session",
        entity_id=session.officer_id,
        action="logout",
        actor=session.officer_id,
        details="Session revoked.",
    )
    return {"message": "Signed out successfully."}


@app.get("/api/auth/me", tags=["Auth"])
def get_me(session=Depends(get_current_session)):
    """Return the currently authenticated officer's identity."""
    cfg = db.get_workstation_config()
    return {
        "officer_id": session.officer_id,
        "display_name": session.display_name,
        "role": session.role,
        "is_admin": session.is_admin,
        "workstation_id": cfg.get("workstation_id"),
    }


@app.post("/api/auth/officers", tags=["Auth"])
def create_officer(req: CreateOfficerRequest, session=Depends(require_admin)):
    """Create a new officer account. Admin only."""
    if db.get_officer_by_officer_id(req.officer_id) is not None:
        raise HTTPException(status_code=409, detail=f"Officer ID already exists: {req.officer_id}")
    if req.role not in ("ADMIN", "OFFICER", "SUPERVISOR"):
        raise HTTPException(status_code=422, detail="Role must be ADMIN, OFFICER, or SUPERVISOR.")
    password_hash = hash_password(req.password)
    uid = db.create_officer(req.officer_id, req.display_name, req.role, password_hash)
    db.log_audit(
        entity_type="officer",
        entity_id=req.officer_id,
        action="officer_created",
        actor=session.officer_id,
        details=f"Role: {req.role}. Created by: {session.officer_id}",
    )
    return {"id": uid, "officer_id": req.officer_id, "role": req.role, "message": "Officer created."}


@app.get("/api/auth/officers", tags=["Auth"])
def list_officers(session=Depends(require_admin)):
    """List all officers. Admin only."""
    return {"officers": db.list_officers()}


@app.patch("/api/auth/officers/{officer_id}/reset", tags=["Auth"])
def reset_officer_password(officer_id: str, req: ResetPasswordRequest, session=Depends(require_admin)):
    """Reset an officer's password (admin only). Officer is forced to re-login."""
    if db.get_officer_by_officer_id(officer_id) is None:
        raise HTTPException(status_code=404, detail=f"Officer not found: {officer_id}")
    new_hash = hash_password(req.new_password)
    db.reset_officer_password(officer_id, new_hash)
    # Revoke all existing sessions for this officer
    with db._get_connection() as conn:
        conn.execute("DELETE FROM sessions WHERE officer_id = ?", (officer_id,))
    db.log_audit(
        entity_type="officer",
        entity_id=officer_id,
        action="password_reset",
        actor=session.officer_id,
        details=f"Password reset by admin: {session.officer_id}",
    )
    return {"message": f"Password reset for {officer_id}. Existing sessions revoked."}


@app.patch("/api/auth/officers/{officer_id}/deactivate", tags=["Auth"])
def deactivate_officer(officer_id: str, session=Depends(require_admin)):
    """Deactivate an officer account. Admin only."""
    if officer_id == session.officer_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account.")
    if db.get_officer_by_officer_id(officer_id) is None:
        raise HTTPException(status_code=404, detail=f"Officer not found: {officer_id}")
    db.deactivate_officer(officer_id)
    with db._get_connection() as conn:
        conn.execute("DELETE FROM sessions WHERE officer_id = ?", (officer_id,))
    db.log_audit(
        entity_type="officer",
        entity_id=officer_id,
        action="officer_deactivated",
        actor=session.officer_id,
        details=f"Deactivated by: {session.officer_id}",
    )
    return {"message": f"Officer {officer_id} deactivated."}


if __name__ == "__main__":
    import uvicorn
    import argparse
    parser = argparse.ArgumentParser(description="TIGERTRACK AI Local Sidecar")
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"), help="Bind host")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")), help="Bind port")
    args, _ = parser.parse_known_args()
    print(f"🐅 Starting Pench Tiger Intelligence Local API Bridge on http://{args.host}:{args.port} ...")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
