import json
import sqlite3
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
        """Initialize tables using schema.sql."""
        schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
        with self._get_connection() as conn:
            conn.executescript(schema_sql)

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
        station_id: str,
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
        with self._get_connection() as conn:
            conn.execute(
                sql,
                (
                    alert_id, alert_type, severity, tiger_id, station_id,
                    timestamp, title, explanation, json.dumps(evidence_data)
                )
            )

    def get_active_alerts(self) -> List[dict]:
        with self._get_connection() as conn:
            rows = conn.execute("SELECT * FROM alerts WHERE is_dismissed = 0 ORDER BY timestamp DESC").fetchall()
            return [dict(r) for r in rows]

    # ── Audit Log ─────────────────────────────────────────────────────────────

    def log_audit(self, entity_type: str, entity_id: str, action: str, details: str = "", actor: str = "SYSTEM_PIPELINE"):
        with self._get_connection() as conn:
            conn.execute(
                "INSERT INTO audit_log (entity_type, entity_id, action, actor, details) VALUES (?, ?, ?, ?, ?)",
                (entity_type, entity_id, action, actor, details)
            )
