"""
config.py — System-wide threshold constants for Pench Tiger Intelligence.

All triage, Re-ID, and alert thresholds must be imported from here.
Do NOT hardcode threshold values in individual modules.
"""

# ── Triage Policy Thresholds ───────────────────────────────────────────────────
# KEEP: detector confidence >= this → route to species classifier and Re-ID
TRIAGE_KEEP_THRESHOLD: float = 0.15

# QUARANTINE: detector confidence < this (with zero boxes) → reversible blank stage
TRIAGE_QUARANTINE_THRESHOLD: float = 0.08

# REVIEW band: [QUARANTINE_THRESHOLD, KEEP_THRESHOLD) → preserve for human audit

# ── Re-ID Decision Thresholds ─────────────────────────────────────────────────
# Confident automatic match (HIGH)
REID_CONFIDENT_THRESHOLD: float = 0.65

# Boundary for human review queue (MEDIUM_REVIEW_REQUIRED)
REID_REVIEW_THRESHOLD: float = 0.45

# Minimum cosine similarity for issuing movement alerts based on a Re-ID result
REID_ALERT_MIN_SIMILARITY: float = 0.65

# Minimum crop resolution for auto-registration of new tiger candidate
REID_MIN_CROP_PX: int = 128

# Minimum detector confidence for new tiger auto-registration candidate
REID_NEW_TIGER_MIN_DETECTOR_CONF: float = 0.50

# ── Alert Engine Thresholds ───────────────────────────────────────────────────
# Territory centroid shift (km) → RANGE_SHIFT alert
ALERT_CENTROID_SHIFT_KM: float = 4.0

# Village proximity (km) → VILLAGE_RISK alert
ALERT_VILLAGE_RISK_KM: float = 2.5

# Buffer boundary proximity (km) → BUFFER_PROXIMITY alert
ALERT_BUFFER_RISK_KM: float = 2.0

# New-station deployment window: station active < this many days → survey effort artifact
ALERT_NEW_STATION_DAYS: int = 30

# Absence anomaly: multiplier applied to the median inter-sighting interval
# Gap > absence_multiplier × median_interval AND adequate survey effort → PROLONGED_ABSENCE alert
ALERT_ABSENCE_MULTIPLIER: float = 3.0

# Minimum number of historical sightings required before triggering an absence alert
ALERT_ABSENCE_MIN_HISTORY: int = 3

# Minimum number of active stations in the tiger's known range for absence to be credible
ALERT_ABSENCE_MIN_ACTIVE_STATIONS: int = 1
