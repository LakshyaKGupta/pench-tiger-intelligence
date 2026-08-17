import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

# Dynamically locate schema.sql relative to db.py
_CURRENT_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _CURRENT_DIR.parent.parent
SCHEMA_PATH = _PROJECT_ROOT / "database" / "schema.sql"
if not SCHEMA_PATH.exists():
    SCHEMA_PATH = _CURRENT_DIR / "schema.sql"

DEFAULT_DB_PATH = _PROJECT_ROOT / "database" / "tiger.db"


class TigerDatabase:
    """Thread-safe SQLite database manager for camera trap & tiger intelligence."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = Path(db_path) if db_path else DEFAULT_DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _init_db(self):
        """Initialize tables using schema.sql, then apply any pending migrations."""
        schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
        with self._get_connection() as conn:
            conn.executescript(schema_sql)
        self._apply_migrations()

    def _apply_migrations(self):
        """Add columns introduced after initial schema without breaking existing DBs."""
        with self._get_connection() as conn:
            existing_det_cols = {row[1] for row in conn.execute("PRAGMA table_info(detections)").fetchall()}
            if "original_reid_tiger_id" not in existing_det_cols:
                conn.execute("ALTER TABLE detections ADD COLUMN original_reid_tiger_id TEXT")
            if "original_reid_similarity" not in existing_det_cols:
                conn.execute("ALTER TABLE detections ADD COLUMN original_reid_similarity REAL")
            if "original_reid_confidence_level" not in existing_det_cols:
                conn.execute("ALTER TABLE detections ADD COLUMN original_reid_confidence_level TEXT")
            if "human_decision" not in existing_det_cols:
                conn.execute("ALTER TABLE detections ADD COLUMN human_decision TEXT")
            if "human_actor" not in existing_det_cols:
                conn.execute("ALTER TABLE detections ADD COLUMN human_actor TEXT")
            if "human_timestamp" not in existing_det_cols:
                conn.execute("ALTER TABLE detections ADD COLUMN human_timestamp TEXT")

            existing_alert_cols = {row[1] for row in conn.execute("PRAGMA table_info(alerts)").fetchall()}
            if "status" not in existing_alert_cols:
                conn.execute("ALTER TABLE alerts ADD COLUMN status TEXT DEFAULT 'OPEN'")
            if "resolution_notes" not in existing_alert_cols:
                conn.execute("ALTER TABLE alerts ADD COLUMN resolution_notes TEXT")
            if "resolved_by" not in existing_alert_cols:
                conn.execute("ALTER TABLE alerts ADD COLUMN resolved_by TEXT")
            if "resolved_at" not in existing_alert_cols:
                conn.execute("ALTER TABLE alerts ADD COLUMN resolved_at TEXT")

            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_movement_tiger_det ON movement_records(tiger_id, detection_id)")

            conn.execute("""
            CREATE TABLE IF NOT EXISTS pipeline_runs (
                run_id TEXT PRIMARY KEY,
                source_type TEXT NOT NULL,
                source_path TEXT NOT NULL,
                status TEXT NOT NULL,
                current_stage TEXT,
                images_discovered INTEGER DEFAULT 0,
                images_processed INTEGER DEFAULT 0,
                duplicates INTEGER DEFAULT 0,
                corrupt_files INTEGER DEFAULT 0,
                tigers_detected INTEGER DEFAULT 0,
                review_required INTEGER DEFAULT 0,
                alerts_generated INTEGER DEFAULT 0,
                error_message TEXT,
                deliverables_dir TEXT,
                started_at TEXT,
                completed_at TEXT
            )
            """)

    # ── Camera Stations & Survey History ───────────────────────────────────────

    def upsert_station(
        self,
        station_id: str,
        latitude: float,
        longitude: float,
        survey_id: str,
        active_from: str,
        active_to: Optional[str] = None,
        camera_model: str = "Reconyx HyperFire 2",
        zone: str = "Core",
        distance_to_village_km: float = 5.0,
        distance_to_buffer_km: float = 10.0,
    ):
        sql = """
        INSERT INTO camera_stations (
            station_id, camera_model, latitude, longitude, active_from,
            active_to, survey_id, zone, distance_to_village_km, distance_to_buffer_km
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(station_id) DO UPDATE SET
            latitude=excluded.latitude,
            longitude=excluded.longitude,
            active_from=excluded.active_from,
            active_to=excluded.active_to,
            survey_id=excluded.survey_id,
            zone=excluded.zone,
            distance_to_village_km=excluded.distance_to_village_km,
            distance_to_buffer_km=excluded.distance_to_buffer_km
        """
        with self._get_connection() as conn:
            conn.execute(
                sql,
                (
                    station_id, camera_model, latitude, longitude, active_from,
                    active_to, survey_id, zone, distance_to_village_km, distance_to_buffer_km
                )
            )

    def get_station(self, station_id: str) -> Optional[dict]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM camera_stations WHERE station_id = ?", (station_id,)).fetchone()
            return dict(row) if row else None

    def get_all_stations(self) -> List[dict]:
        with self._get_connection() as conn:
            rows = conn.execute("SELECT * FROM camera_stations ORDER BY station_id").fetchall()
            return [dict(r) for r in rows]

    # ── Known Individual Tigers Master Catalog ─────────────────────────────────

    def register_tiger(
        self,
        tiger_id: str,
        name: Optional[str] = None,
        gender: str = "Unknown",
        estimated_age: Optional[float] = None,
        reference_image_path: Optional[str] = None,
        embedding: Optional[np.ndarray] = None,
        flank_side: str = "both",
        notes: str = "",
    ):
        emb_bytes = embedding.astype(np.float32).tobytes() if embedding is not None else None
        sql = """
        INSERT INTO tigers (
            tiger_id, name, gender, estimated_age, primary_flank_registered,
            reference_embedding_left, reference_embedding_right,
            reference_image_path, total_sightings, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(tiger_id) DO UPDATE SET
            name=COALESCE(excluded.name, tigers.name),
            gender=COALESCE(excluded.gender, tigers.gender),
            reference_image_path=COALESCE(excluded.reference_image_path, tigers.reference_image_path),
            total_sightings=tigers.total_sightings + 1
        """
        emb_left = emb_bytes if flank_side in ("left", "left_candidate", "both") else None
        emb_right = emb_bytes if flank_side in ("right", "right_candidate", "both") else None

        with self._get_connection() as conn:
            conn.execute(sql, (tiger_id, name or tiger_id, gender, estimated_age, flank_side, emb_left, emb_right, reference_image_path, notes))

        # Also insert into multi-reference gallery if embedding provided
        if embedding is not None:
            self.add_reference_embedding(
                tiger_id=tiger_id,
                embedding=embedding,
                crop_type=flank_side,
                source_crop_path=reference_image_path,
            )

    def add_reference_embedding(
        self,
        tiger_id: str,
        embedding: np.ndarray,
        crop_type: str = "flank",
        source_crop_path: Optional[str] = None,
        encounter_image_id: Optional[str] = None,
    ):
        """Add an embedding to the individual's multi-reference gallery."""
        emb_bytes = embedding.astype(np.float32).tobytes()
        sql = """
        INSERT INTO tiger_reference_embeddings (
            tiger_id, encounter_image_id, crop_type, embedding, source_crop_path
        ) VALUES (?, ?, ?, ?, ?)
        """
        with self._get_connection() as conn:
            conn.execute(sql, (tiger_id, encounter_image_id, crop_type, emb_bytes, source_crop_path))

    def get_all_tigers(self) -> List[dict]:
        with self._get_connection() as conn:
            rows = conn.execute("SELECT * FROM tigers ORDER BY tiger_id").fetchall()
            return [dict(r) for r in rows]

    def get_tiger_reference_gallery(self) -> List[Dict]:
        """
        Return list of all reference embeddings in the gallery:
        [
            {
                'tiger_id': 'T-001',
                'embedding': np.ndarray(768,),
                'crop_type': 'left_candidate',
                'source_crop_path': '...'
            },
            ...
        ]
        """
        results = []
        with self._get_connection() as conn:
            rows = conn.execute("SELECT tiger_id, crop_type, embedding, source_crop_path FROM tiger_reference_embeddings").fetchall()
            for r in rows:
                arr = np.frombuffer(r["embedding"], dtype=np.float32)
                results.append({
                    "tiger_id": r["tiger_id"],
                    "embedding": arr,
                    "crop_type": r["crop_type"],
                    "source_crop_path": r["source_crop_path"],
                })

        # Fallback to master tigers table if multi-reference table is empty
        if not results:
            master_rows = conn.execute("SELECT tiger_id, reference_embedding_left, reference_embedding_right, reference_image_path FROM tigers").fetchall()
            for r in master_rows:
                tid = r["tiger_id"]
                if r["reference_embedding_left"]:
                    arr = np.frombuffer(r["reference_embedding_left"], dtype=np.float32)
                    results.append({"tiger_id": tid, "embedding": arr, "crop_type": "left_candidate", "source_crop_path": r["reference_image_path"]})
                if r["reference_embedding_right"]:
                    arr = np.frombuffer(r["reference_embedding_right"], dtype=np.float32)
                    results.append({"tiger_id": tid, "embedding": arr, "crop_type": "right_candidate", "source_crop_path": r["reference_image_path"]})

        return results

    def get_tiger_embeddings(self) -> List[Tuple[str, np.ndarray, str]]:
        """Backward-compatible tuple return: (tiger_id, embedding, flank_side)."""
        gallery = self.get_tiger_reference_gallery()
        return [(g["tiger_id"], g["embedding"], g["crop_type"]) for g in gallery]

    def update_tiger_occupancy(
        self,
        tiger_id: str,
        centroid_lat: float,
        centroid_lon: float,
        home_range_area_km2: float,
        last_seen: str,
    ):
        sql = """
        UPDATE tigers SET
            current_centroid_lat = ?,
            current_centroid_lon = ?,
            home_range_area_km2 = ?,
            last_seen = ?,
            total_sightings = total_sightings + 1
        WHERE tiger_id = ?
        """
        with self._get_connection() as conn:
            conn.execute(sql, (centroid_lat, centroid_lon, home_range_area_km2, last_seen, tiger_id))

    # ── Image Ingestion ────────────────────────────────────────────────────────

    def record_image(
        self,
        image_id: str,
        original_path: str,
        file_name: str,
        file_size_bytes: int,
        source_folder: str,
        station_id: Optional[str] = None,
        timestamp: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        is_corrupt: bool = False,
        status: str = "raw",
        quality_flags: Optional[List[str]] = None,
    ):
        sql = """
        INSERT INTO images (
            image_id, original_path, source_folder, file_name, file_size_bytes,
            station_id, timestamp, latitude, longitude, is_corrupt, status, data_quality_flags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(image_id) DO UPDATE SET
            status=excluded.status,
            data_quality_flags=excluded.data_quality_flags
        """
        flags_json = json.dumps(quality_flags or [])
        with self._get_connection() as conn:
            conn.execute(
                sql,
                (
                    image_id, original_path, source_folder, file_name, file_size_bytes,
                    station_id, timestamp, latitude, longitude, int(is_corrupt), status, flags_json
                )
            )

    # ── Detections & Re-ID Records ────────────────────────────────────────────

    def record_detection(
        self,
        detection_id: str,
        image_id: str,
        station_id: str,
        timestamp: str,
        is_animal: bool,
        is_human: bool,
        is_vehicle: bool,
        is_blank: bool,
        detected_species: str,
        species_confidence: float,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        crop_path: Optional[str] = None,
        flank_orientation: str = "body_candidate",
        reid_matched_tiger_id: Optional[str] = None,
        reid_similarity: float = 0.0,
        reid_confidence_level: str = "NONE",
        reid_evidence_breakdown: Optional[dict] = None,
    ):
        sql = """
        INSERT INTO detections (
            detection_id, image_id, station_id, timestamp,
            is_animal, is_human, is_vehicle, is_blank,
            detected_species, species_confidence,
            bbox_x1, bbox_y1, bbox_x2, bbox_y2,
            crop_path, flank_orientation,
            reid_matched_tiger_id, reid_similarity,
            reid_confidence_level, reid_evidence_breakdown
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(detection_id) DO UPDATE SET
            station_id=excluded.station_id,
            timestamp=excluded.timestamp,
            detected_species=excluded.detected_species,
            species_confidence=excluded.species_confidence,
            crop_path=excluded.crop_path,
            flank_orientation=excluded.flank_orientation,
            reid_matched_tiger_id=excluded.reid_matched_tiger_id,
            reid_similarity=excluded.reid_similarity,
            reid_confidence_level=excluded.reid_confidence_level,
            reid_evidence_breakdown=excluded.reid_evidence_breakdown
        """
        x1, y1, x2, y2 = bbox if bbox else (None, None, None, None)
        evidence_json = json.dumps(reid_evidence_breakdown or {})

        with self._get_connection() as conn:
            conn.execute(
                sql,
                (
                    detection_id, image_id, station_id, timestamp,
                    int(is_animal), int(is_human), int(is_vehicle), int(is_blank),
                    detected_species, species_confidence,
                    x1, y1, x2, y2,
                    crop_path, flank_orientation,
                    reid_matched_tiger_id, reid_similarity,
                    reid_confidence_level, evidence_json
                )
            )

    def record_movement(
        self,
        tiger_id: str,
        detection_id: str,
        station_id: str,
        timestamp: str,
        latitude: float,
        longitude: float,
        survey_id: str = "Pench_2026_Cycle1",
    ):
        sql = """
        INSERT OR IGNORE INTO movement_records (
            tiger_id, detection_id, station_id, timestamp, latitude, longitude, survey_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        with self._get_connection() as conn:
            conn.execute(sql, (tiger_id, detection_id, station_id, timestamp, latitude, longitude, survey_id))

    def get_tiger_movement_history(self, tiger_id: str) -> List[dict]:
        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT m.*, c.zone, c.distance_to_village_km, c.distance_to_buffer_km
                FROM movement_records m
                LEFT JOIN camera_stations c ON m.station_id = c.station_id
                WHERE m.tiger_id = ?
                ORDER BY m.timestamp ASC
                """,
                (tiger_id,)
            ).fetchall()
            return [dict(r) for r in rows]

    # ── Explainable Alerts ────────────────────────────────────────────────────

    def record_alert(
        self,
        alert_id: str,
        alert_type: str,
        severity: str,
        tiger_id: str,
        station_id: Optional[str],
        timestamp: str,
        title: str,
        explanation: str,
        evidence_data: dict,
    ):
        sql = """
        INSERT INTO alerts (
            alert_id, alert_type, severity, tiger_id, station_id,
            timestamp, title, explanation, evidence_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(alert_id) DO NOTHING
        """
        stn = station_id if station_id else None
        with self._get_connection() as conn:
            conn.execute(
                sql,
                (
                    alert_id, alert_type, severity, tiger_id, stn,
                    timestamp, title, explanation, json.dumps(evidence_data)
                )
            )

    def get_active_alerts(self, tiger_id: Optional[str] = None) -> List[dict]:
        """Retrieve all non-dismissed / active operational alerts."""
        with self._get_connection() as conn:
            if tiger_id:
                rows = conn.execute(
                    "SELECT * FROM alerts WHERE tiger_id = ? AND is_dismissed = 0 ORDER BY timestamp DESC",
                    (tiger_id,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM alerts WHERE is_dismissed = 0 ORDER BY timestamp DESC"
                ).fetchall()
            alerts = []
            for r in rows:
                d = dict(r)
                if "evidence_data" in d and isinstance(d["evidence_data"], str):
                    try:
                        d["evidence_data"] = json.loads(d["evidence_data"])
                    except Exception:
                        pass
                alerts.append(d)
            return alerts

    def update_alert_status(
        self,
        alert_id: str,
        new_status: str,
        actor: str = "OFFICER_PATIL",
        notes: str = "",
    ) -> Optional[dict]:
        """
        Transition an alert to OPEN, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE, or SUPPRESSED.
        Strictly enforces the legal directed state transition graph:
          OPEN -> ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE, SUPPRESSED
          ACKNOWLEDGED -> RESOLVED, FALSE_POSITIVE, SUPPRESSED, OPEN
          RESOLVED / FALSE_POSITIVE / SUPPRESSED -> OPEN (explicit reopen only)
        """
        valid_statuses = {"OPEN", "ACKNOWLEDGED", "RESOLVED", "FALSE_POSITIVE", "SUPPRESSED"}
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid alert status '{new_status}'. Allowed: {valid_statuses}")

        timestamp = datetime.now().isoformat()
        is_dismissed = 1 if new_status in ("RESOLVED", "FALSE_POSITIVE", "SUPPRESSED") else 0

        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM alerts WHERE alert_id = ?", (alert_id,)).fetchone()
            if not row:
                return None
            prev_status = row["status"] if "status" in row.keys() and row["status"] else "OPEN"

            # Legal transition graph validation
            legal_transitions = {
                "OPEN": {"ACKNOWLEDGED", "RESOLVED", "FALSE_POSITIVE", "SUPPRESSED", "OPEN"},
                "ACKNOWLEDGED": {"RESOLVED", "FALSE_POSITIVE", "SUPPRESSED", "OPEN", "ACKNOWLEDGED"},
                "RESOLVED": {"OPEN", "RESOLVED"},
                "FALSE_POSITIVE": {"OPEN", "FALSE_POSITIVE"},
                "SUPPRESSED": {"OPEN", "SUPPRESSED"},
            }
            if new_status not in legal_transitions.get(prev_status, {"OPEN"}):
                raise ValueError(
                    f"Illegal alert state transition: Cannot transition from '{prev_status}' to '{new_status}'. "
                    f"Terminal alerts must be reopened to 'OPEN' first."
                )

            conn.execute("""
                UPDATE alerts SET
                    status = ?,
                    is_dismissed = ?,
                    resolution_notes = ?,
                    resolved_by = ?,
                    resolved_at = ?
                WHERE alert_id = ?
            """, (new_status, is_dismissed, notes, actor, timestamp, alert_id))

        self.log_audit(
            entity_type="alert",
            entity_id=alert_id,
            action=f"alert_{new_status.lower()}",
            actor=actor,
            details=json.dumps({
                "previous_status": prev_status,
                "new_status": new_status,
                "reason": notes,
                "timestamp": timestamp,
            }),
        )
        return {
            "alert_id": alert_id,
            "previous_status": prev_status,
            "new_status": new_status,
            "actor": actor,
            "notes": notes,
            "timestamp": timestamp,
        }

    def sync_tiger_spatial_metrics(self, tiger_id: str):
        """
        Recalculate total sightings, last seen, home range centroid and MCP area
        for a given tiger directly from authoritative movement_records.
        """
        from app.occupancy.mcp import calculate_tiger_home_range
        history = self.get_tiger_movement_history(tiger_id)
        if not history:
            with self._get_connection() as conn:
                conn.execute(
                    "UPDATE tigers SET total_sightings = 0, home_range_area_km2 = 0.0 WHERE tiger_id = ?",
                    (tiger_id,)
                )
            return

        occ = calculate_tiger_home_range(history)
        last_seen = history[-1]["timestamp"]
        total_sightings = len(history)

        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE tigers SET
                    current_centroid_lat = ?,
                    current_centroid_lon = ?,
                    home_range_area_km2 = ?,
                    last_seen = ?,
                    total_sightings = ?
                WHERE tiger_id = ?
                """,
                (
                    occ.get("centroid_lat"),
                    occ.get("centroid_lon"),
                    occ.get("home_range_km2", 0.0),
                    last_seen,
                    total_sightings,
                    tiger_id,
                )
            )

    # ── Ingestion Pipeline Runs ────────────────────────────────────────────────

    def record_pipeline_run(
        self,
        run_id: str,
        source_type: str,
        source_path: str,
        status: str = "RUNNING",
        current_stage: str = "DISCOVERING",
        images_discovered: int = 0,
    ):
        timestamp = datetime.now().isoformat()
        sql = """
        INSERT INTO pipeline_runs (
            run_id, source_type, source_path, status, current_stage,
            images_discovered, started_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(run_id) DO UPDATE SET
            status=excluded.status,
            current_stage=excluded.current_stage,
            images_discovered=excluded.images_discovered
        """
        with self._get_connection() as conn:
            conn.execute(sql, (run_id, source_type, source_path, status, current_stage, images_discovered, timestamp))

    def update_pipeline_run(
        self,
        run_id: str,
        status: str,
        current_stage: Optional[str] = None,
        images_processed: int = 0,
        duplicates: int = 0,
        corrupt_files: int = 0,
        tigers_detected: int = 0,
        review_required: int = 0,
        alerts_generated: int = 0,
        error_message: Optional[str] = None,
        deliverables_dir: Optional[str] = None,
    ):
        timestamp = datetime.now().isoformat()
        completed_at = timestamp if status in ("COMPLETED", "FAILED", "CANCELLED") else None
        sql = """
        UPDATE pipeline_runs SET
            status = ?,
            current_stage = COALESCE(?, current_stage),
            images_processed = ?,
            duplicates = ?,
            corrupt_files = ?,
            tigers_detected = ?,
            review_required = ?,
            alerts_generated = ?,
            error_message = ?,
            deliverables_dir = COALESCE(?, deliverables_dir),
            completed_at = COALESCE(?, completed_at)
        WHERE run_id = ?
        """
        with self._get_connection() as conn:
            conn.execute(sql, (
                status, current_stage, images_processed, duplicates,
                corrupt_files, tigers_detected, review_required, alerts_generated,
                error_message, deliverables_dir, completed_at, run_id
            ))

    # ── Audit Log ─────────────────────────────────────────────────────────────

    def log_audit(self, entity_type: str, entity_id: str, action: str, details: str = "", actor: str = "SYSTEM_PIPELINE"):
        with self._get_connection() as conn:
            conn.execute(
                "INSERT INTO audit_log (entity_type, entity_id, action, actor, details) VALUES (?, ?, ?, ?, ?)",
                (entity_type, entity_id, action, actor, details)
            )

    # ── Human-in-the-Loop Review ─────────────────────────────────────────────

    def apply_human_correction(
        self,
        detection_id: str,
        human_decision: str,          # 'CONFIRMED', 'REJECTED', 'REASSIGNED', 'NEW_TIGER'
        corrected_tiger_id: Optional[str] = None,  # final identity after human decision
        actor: str = "OFFICER",
    ) -> bool:
        """
        Persist a human review decision for a detection and atomically update downstream movement records.
        """
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT d.*, c.latitude, c.longitude FROM detections d "
                "LEFT JOIN camera_stations c ON d.station_id = c.station_id "
                "WHERE d.detection_id = ?",
                (detection_id,)
            ).fetchone()
            if row is None:
                return False

            det = dict(row)
            orig_tiger_id = det.get("original_reid_tiger_id") or det.get("reid_matched_tiger_id")
            final_tiger_id = corrected_tiger_id if human_decision in ("CONFIRMED", "REASSIGNED", "NEW_TIGER") else None
            if human_decision == "CONFIRMED" and not final_tiger_id:
                final_tiger_id = orig_tiger_id

            timestamp = datetime.now().isoformat()

            # 1. Update detections row
            conn.execute(
                """
                UPDATE detections SET
                    original_reid_tiger_id = COALESCE(original_reid_tiger_id, reid_matched_tiger_id),
                    original_reid_similarity = COALESCE(original_reid_similarity, reid_similarity),
                    original_reid_confidence_level = COALESCE(original_reid_confidence_level, reid_confidence_level),
                    human_decision = ?,
                    human_actor = ?,
                    human_timestamp = ?,
                    human_verified = 1,
                    verified_tiger_id = ?
                WHERE detection_id = ?
                """,
                (
                    human_decision,
                    actor,
                    timestamp,
                    final_tiger_id,
                    detection_id,
                )
            )

            # 2. If NEW_TIGER, register in tigers table if not exists
            if human_decision == "NEW_TIGER" and final_tiger_id:
                conn.execute(
                    """
                    INSERT INTO tigers (tiger_id, name, status, first_seen, last_seen, total_sightings)
                    VALUES (?, ?, 'RESIDENT', ?, ?, 0)
                    ON CONFLICT(tiger_id) DO NOTHING
                    """,
                    (final_tiger_id, final_tiger_id, det.get("timestamp", timestamp), det.get("timestamp", timestamp))
                )

            # 3. Synchronize movement_records
            if human_decision in ("CONFIRMED", "REASSIGNED", "NEW_TIGER") and final_tiger_id:
                mv_row = conn.execute("SELECT record_id FROM movement_records WHERE detection_id = ?", (detection_id,)).fetchone()
                if mv_row:
                    conn.execute(
                        "UPDATE movement_records SET tiger_id = ? WHERE detection_id = ?",
                        (final_tiger_id, detection_id)
                    )
                else:
                    stn_lat = det.get("latitude") or 21.75
                    stn_lon = det.get("longitude") or 79.30
                    conn.execute(
                        """
                        INSERT INTO movement_records (
                            tiger_id, detection_id, station_id, timestamp, latitude, longitude
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(tiger_id, detection_id) DO UPDATE SET
                            tiger_id=excluded.tiger_id
                        """,
                        (
                            final_tiger_id,
                            detection_id,
                            det.get("station_id", "STN01"),
                            det.get("timestamp", timestamp),
                            stn_lat,
                            stn_lon,
                        )
                    )
            elif human_decision == "REJECTED":
                conn.execute("DELETE FROM movement_records WHERE detection_id = ?", (detection_id,))

        # 4. Recalculate spatial metrics for affected tigers
        if orig_tiger_id:
            self.sync_tiger_spatial_metrics(orig_tiger_id)
        if final_tiger_id and final_tiger_id != orig_tiger_id:
            self.sync_tiger_spatial_metrics(final_tiger_id)

        # 5. Log audit trail
        self.log_audit(
            entity_type="detection",
            entity_id=detection_id,
            action="human_correction_applied",
            actor=actor,
            details=json.dumps({
                "human_decision": human_decision,
                "corrected_tiger_id": final_tiger_id,
                "original_tiger_id": orig_tiger_id,
                "timestamp": timestamp,
            }),
        )
        return True

    def get_pending_reviews(self) -> List[dict]:
        """
        Return all detections in MEDIUM_REVIEW_REQUIRED state that have not yet been
        reviewed by a human officer.
        """
        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT d.*, i.original_path, i.file_name
                FROM detections d
                JOIN images i ON d.image_id = i.image_id
                WHERE d.reid_confidence_level = 'MEDIUM_REVIEW_REQUIRED'
                  AND d.human_verified = 0
                ORDER BY d.timestamp DESC
                """
            ).fetchall()
            return [dict(r) for r in rows]

    # ── Absence Detection Support ─────────────────────────────────────────────

    def get_tigers_for_absence_check(self) -> List[dict]:
        """
        Return all tigers with enough sighting history for absence evaluation.
        For each tiger returns:
          tiger_id, last_seen (ISO timestamp), sighting_timestamps (list),
          known_station_ids (list of stations tiger has been seen at)
        """
        tigers = self.get_all_tigers()
        results = []
        for t in tigers:
            tid = t["tiger_id"]
            history = self.get_tiger_movement_history(tid)
            if not history:
                continue
            timestamps = [h["timestamp"] for h in history if h.get("timestamp")]
            station_ids = list({h["station_id"] for h in history if h.get("station_id")})
            results.append({
                "tiger_id": tid,
                "last_seen": history[-1]["timestamp"],
                "sighting_timestamps": timestamps,
                "known_station_ids": station_ids,
            })
        return results

    def get_active_stations_in_set(self, station_ids: List[str], as_of: str) -> List[dict]:
        """
        Return stations from the given list that were active (active_from <= as_of
        and active_to is NULL or active_to >= as_of).
        """
        if not station_ids:
            return []
        placeholders = ",".join("?" * len(station_ids))
        with self._get_connection() as conn:
            rows = conn.execute(
                f"""
                SELECT * FROM camera_stations
                WHERE station_id IN ({placeholders})
                  AND active_from <= ?
                  AND (active_to IS NULL OR active_to >= ?)
                """,
                tuple(station_ids) + (as_of, as_of)
            ).fetchall()
            return [dict(r) for r in rows]
