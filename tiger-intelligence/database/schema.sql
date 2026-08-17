-- schema.sql: SQLite Database Schema for Pench Tiger Reserve Intelligence System

-- 1. Camera Stations & Survey Effort History
CREATE TABLE IF NOT EXISTS camera_stations (
    station_id TEXT PRIMARY KEY,
    camera_model TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    active_from TEXT NOT NULL,
    active_to TEXT,
    survey_id TEXT NOT NULL,
    zone TEXT DEFAULT 'Core',  -- 'Core', 'Buffer', 'Corridor', 'Fringe'
    distance_to_village_km REAL DEFAULT 5.0,
    distance_to_buffer_km REAL DEFAULT 10.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Known Individual Tigers Master Table
CREATE TABLE IF NOT EXISTS tigers (
    tiger_id TEXT PRIMARY KEY,          -- e.g. 'T-001', 'T-007', 'T-NEW-014'
    name TEXT,                          -- e.g. 'Collarwali', 'Baghwan Male'
    gender TEXT,                        -- 'M', 'F', 'Unknown'
    estimated_age REAL,
    status TEXT DEFAULT 'Resident',     -- 'Resident', 'Displaced', 'Transient', 'Missing'
    first_seen TEXT,
    last_seen TEXT,
    primary_flank_registered TEXT,      -- 'left', 'right', 'both'
    reference_embedding_left BLOB,      -- Float32 array serialized
    reference_embedding_right BLOB,     -- Float32 array serialized
    reference_image_path TEXT,
    total_sightings INTEGER DEFAULT 0,
    current_centroid_lat REAL,
    current_centroid_lon REAL,
    home_range_area_km2 REAL DEFAULT 0.0,
    notes TEXT
);

-- 2b. Multi-Reference Embeddings per Individual (Multi-Pose / Multi-Encounter Gallery)
CREATE TABLE IF NOT EXISTS tiger_reference_embeddings (
    embedding_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tiger_id TEXT NOT NULL,
    encounter_image_id TEXT,
    crop_type TEXT DEFAULT 'flank',     -- 'left_candidate', 'right_candidate', 'body_candidate'
    embedding BLOB NOT NULL,            -- 768-dim Float32 serialized array
    source_crop_path TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tiger_id) REFERENCES tigers(tiger_id)
);

-- 3. Raw Camera Trap Images & Ingestion Records
CREATE TABLE IF NOT EXISTS images (
    image_id TEXT PRIMARY KEY,
    original_path TEXT NOT NULL,
    source_folder TEXT,
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER,
    station_id TEXT,
    timestamp TEXT,
    latitude REAL,
    longitude REAL,
    is_corrupt INTEGER DEFAULT 0,
    status TEXT DEFAULT 'raw',          -- 'raw', 'retained', 'quarantined', 'reviewed'
    data_quality_flags TEXT,            -- JSON array e.g. ["clock_drift_suspected", "gps_missing"]
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES camera_stations(station_id)
);

-- 4. Processed Detections (MegaDetector + SpeciesNet + Tiger Re-ID)
CREATE TABLE IF NOT EXISTS detections (
    detection_id TEXT PRIMARY KEY,
    image_id TEXT NOT NULL,
    station_id TEXT,
    timestamp TEXT,
    is_animal INTEGER DEFAULT 0,
    is_human INTEGER DEFAULT 0,
    is_vehicle INTEGER DEFAULT 0,
    is_blank INTEGER DEFAULT 1,
    detected_species TEXT DEFAULT 'blank',  -- 'tiger', 'leopard', 'sloth_bear', 'human', 'blank', etc.
    species_confidence REAL DEFAULT 0.0,
    bbox_x1 REAL,
    bbox_y1 REAL,
    bbox_x2 REAL,
    bbox_y2 REAL,
    crop_path TEXT,
    flank_orientation TEXT,             -- 'left_candidate', 'right_candidate', 'body_candidate'
    reid_matched_tiger_id TEXT,
    reid_similarity REAL DEFAULT 0.0,
    reid_confidence_level TEXT,         -- 'HIGH', 'MEDIUM_REVIEW_REQUIRED', 'LOW_NEW_INDIVIDUAL'
    reid_evidence_breakdown TEXT,       -- JSON breakdown of factors
    human_verified INTEGER DEFAULT 0,
    verified_tiger_id TEXT,
    FOREIGN KEY (image_id) REFERENCES images(image_id),
    FOREIGN KEY (reid_matched_tiger_id) REFERENCES tigers(tiger_id),
    FOREIGN KEY (station_id) REFERENCES camera_stations(station_id)
);

-- 5. Movement Trajectory & Occupancy History
CREATE TABLE IF NOT EXISTS movement_records (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tiger_id TEXT NOT NULL,
    detection_id TEXT NOT NULL,
    station_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    survey_id TEXT,
    UNIQUE(tiger_id, detection_id),
    FOREIGN KEY (tiger_id) REFERENCES tigers(tiger_id),
    FOREIGN KEY (detection_id) REFERENCES detections(detection_id),
    FOREIGN KEY (station_id) REFERENCES camera_stations(station_id)
);

-- 6. Explainable Movement & Ecological Alerts
CREATE TABLE IF NOT EXISTS alerts (
    alert_id TEXT PRIMARY KEY,
    alert_type TEXT NOT NULL,           -- 'RANGE_SHIFT', 'NEW_STATION_ACTIVE_PREV', 'BUFFER_PROXIMITY', 'VILLAGE_RISK', 'PROLONGED_ABSENCE'
    severity TEXT NOT NULL,             -- 'CRITICAL', 'WARNING', 'INFO'
    tiger_id TEXT NOT NULL,
    station_id TEXT,
    timestamp TEXT NOT NULL,
    title TEXT NOT NULL,
    explanation TEXT NOT NULL,
    evidence_data TEXT,                 -- JSON payload (coordinates, survey effort, distances, days absent)
    status TEXT DEFAULT 'OPEN',         -- 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE', 'SUPPRESSED'
    is_dismissed INTEGER DEFAULT 0,
    resolution_notes TEXT,
    resolved_by TEXT,
    resolved_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tiger_id) REFERENCES tigers(tiger_id),
    FOREIGN KEY (station_id) REFERENCES camera_stations(station_id)
);

-- 7. Audit Log (Human & Automated Decisions)
CREATE TABLE IF NOT EXISTS audit_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    entity_type TEXT NOT NULL,          -- 'image', 'detection', 'tiger', 'alert'
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,               -- 'ingested', 'quarantined', 'retained', 'reid_matched', 'human_overridden'
    actor TEXT DEFAULT 'SYSTEM_PIPELINE',
    details TEXT
);

-- 8. Ingestion Pipeline Runs (Batch Tracking & Telemetry)
CREATE TABLE IF NOT EXISTS pipeline_runs (
    run_id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_path TEXT NOT NULL,
    status TEXT NOT NULL,               -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
    current_stage TEXT,                 -- 'DISCOVERING', 'VALIDATING', 'DEDUPLICATING', 'METADATA_EXTRACTION', 'TRIAGE', 'DETECTION', 'REID', 'MOVEMENT', 'ALERTS', 'COMPLETED'
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
);
