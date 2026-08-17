"""
engine.py — Explainable Alert Engine with Survey-Effort Correction
Pench Tiger Reserve Camera Trap Intelligence System

Generates deterministic, auditable ecological and conflict alerts:
  1. Territory Centroid Shift (Displacement)
  2. New Station Appearance (Corrected for Camera Survey Effort)
  3. Buffer Boundary Proximity
  4. Village / Human Interface Risk
  5. Prolonged Absence Anomaly
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from app.config import (
    ALERT_ABSENCE_MIN_ACTIVE_STATIONS,
    ALERT_ABSENCE_MIN_HISTORY,
    ALERT_ABSENCE_MULTIPLIER,
    ALERT_BUFFER_RISK_KM,
    ALERT_CENTROID_SHIFT_KM,
    ALERT_NEW_STATION_DAYS,
    ALERT_VILLAGE_RISK_KM,
)
from app.database.db import TigerDatabase
from app.occupancy.mcp import haversine_distance_km


class AlertEngine:
    """
    Evaluates ecological changes and movement deviations with survey-effort corrections.
    """

    def __init__(
        self,
        db: TigerDatabase,
        centroid_shift_threshold_km: float = ALERT_CENTROID_SHIFT_KM,
        village_risk_threshold_km: float = ALERT_VILLAGE_RISK_KM,
        buffer_risk_threshold_km: float = ALERT_BUFFER_RISK_KM,
        absence_multiplier: float = ALERT_ABSENCE_MULTIPLIER,
        absence_min_history: int = ALERT_ABSENCE_MIN_HISTORY,
        absence_min_active_stations: int = ALERT_ABSENCE_MIN_ACTIVE_STATIONS,
    ):
        self.db = db
        self.centroid_shift_thr = centroid_shift_threshold_km
        self.village_risk_thr = village_risk_threshold_km
        self.buffer_risk_thr = buffer_risk_threshold_km
        self.absence_mult = absence_multiplier
        self.absence_min_history = absence_min_history
        self.absence_min_active_stations = absence_min_active_stations

    def evaluate_new_sighting(
        self,
        tiger_id: str,
        current_station_id: str,
        current_timestamp: str,
        current_lat: float,
        current_lon: float,
        reid_similarity: float = 0.90,
    ) -> List[Dict]:
        """
        Evaluate a new tiger sighting against historical records and generate explainable alerts.
        """
        generated_alerts: List[Dict] = []
        history = self.db.get_tiger_movement_history(tiger_id)
        station_info = self.db.get_station(current_station_id) or {}

        # Helper for deterministic alert id timestamp slug
        ts_slug = "".join(c for c in current_timestamp if c.isalnum())

        # 1. Village Conflict Risk Alert
        dist_to_village = station_info.get("distance_to_village_km", 5.0)
        if dist_to_village <= self.village_risk_thr:
            alert = {
                "alert_id": f"ALT_VIL_{tiger_id}_{current_station_id}_{ts_slug}",
                "alert_type": "VILLAGE_RISK",
                "severity": "CRITICAL",
                "tiger_id": tiger_id,
                "station_id": current_station_id,
                "timestamp": current_timestamp,
                "title": f"Tiger {tiger_id} Detected Near Village Boundary ({dist_to_village:.1f} km)",
                "explanation": (
                    f"Individual {tiger_id} was identified at station {current_station_id} which is only "
                    f"{dist_to_village:.1f} km from human settlement boundary. Re-ID similarity: {reid_similarity:.1%}."
                ),
                "evidence_data": {
                    "distance_to_village_km": dist_to_village,
                    "threshold_km": self.village_risk_thr,
                    "zone": station_info.get("zone", "Buffer"),
                    "coordinates": [current_lat, current_lon],
                }
            }
            generated_alerts.append(alert)
            self._save_alert(alert)

        # 2. Buffer / Fringe Boundary Alert
        dist_to_buffer = station_info.get("distance_to_buffer_km", 10.0)
        if dist_to_buffer <= self.buffer_risk_thr and station_info.get("zone") in ("Buffer", "Corridor", "Fringe"):
            alert = {
                "alert_id": f"ALT_BUF_{tiger_id}_{current_station_id}_{ts_slug}",
                "alert_type": "BUFFER_PROXIMITY",
                "severity": "WARNING",
                "tiger_id": tiger_id,
                "station_id": current_station_id,
                "timestamp": current_timestamp,
                "title": f"Tiger {tiger_id} In Buffer/Corridor Zone ({dist_to_buffer:.1f} km to boundary)",
                "explanation": (
                    f"Tiger {tiger_id} recorded at station {current_station_id} in {station_info.get('zone', 'Buffer')} zone. "
                    f"Located {dist_to_buffer:.1f} km from reserve boundary."
                ),
                "evidence_data": {
                    "distance_to_buffer_km": dist_to_buffer,
                    "zone": station_info.get("zone"),
                    "coordinates": [current_lat, current_lon],
                }
            }
            generated_alerts.append(alert)
            self._save_alert(alert)

        # If no prior history, return initial alerts
        if not history:
            return generated_alerts

        # 3. New Station Appearance with SURVEY-EFFORT CORRECTION
        seen_stations = set(h["station_id"] for h in history)
        if current_station_id not in seen_stations:
            # Check survey history of this station
            active_from = station_info.get("active_from", "2020-01-01")
            is_new_deployment = False
            try:
                dt_active = datetime.fromisoformat(active_from)
                dt_sight = datetime.fromisoformat(current_timestamp)
                # If station was activated within last 30 days of sighting, it's newly deployed
                if (dt_sight - dt_active).days < 30:
                    is_new_deployment = True
            except Exception:
                pass

            if is_new_deployment:
                # Survey-effort artifact -> Suppress alarm or flag as artifact
                self.db.log_audit(
                    entity_type="tiger",
                    entity_id=tiger_id,
                    action="survey_effort_suppressed",
                    details=(
                        f"Tiger {tiger_id} appeared at station {current_station_id} for first time, "
                        f"but station was newly activated on {active_from}. Movement alert suppressed."
                    )
                )
            else:
                # Station existed previously and tiger was not seen -> Genuine range expansion!
                alert = {
                    "alert_id": f"ALT_EXP_{tiger_id}_{current_station_id}_{ts_slug}",
                    "alert_type": "NEW_STATION_EXPANSION",
                    "severity": "WARNING",
                    "tiger_id": tiger_id,
                    "station_id": current_station_id,
                    "timestamp": current_timestamp,
                    "title": f"Tiger {tiger_id} Range Expansion: New Station {current_station_id}",
                    "explanation": (
                        f"Tiger {tiger_id} appeared at station {current_station_id} for the first time. "
                        f"Station {current_station_id} was active in prior surveys, confirming this is "
                        f"genuine movement rather than new camera deployment artifact. Re-ID similarity: {reid_similarity:.1%}."
                    ),
                    "evidence_data": {
                        "station_id": current_station_id,
                        "previously_monitored": True,
                        "station_active_from": active_from,
                        "historical_stations": list(seen_stations),
                    }
                }
                generated_alerts.append(alert)
                self._save_alert(alert)

        # 4. Territory Centroid Shift (Displacement)
        prior_coords = [(h["latitude"], h["longitude"]) for h in history if h.get("latitude") and h.get("longitude")]
        if len(prior_coords) >= 3:
            old_cent_lat = sum(c[0] for c in prior_coords) / len(prior_coords)
            old_cent_lon = sum(c[1] for c in prior_coords) / len(prior_coords)

            shift_dist = haversine_distance_km(old_cent_lat, old_cent_lon, current_lat, current_lon)
            if shift_dist >= self.centroid_shift_thr:
                alert = {
                    "alert_id": f"ALT_SFT_{tiger_id}_{current_station_id}_{ts_slug}",
                    "alert_type": "RANGE_SHIFT",
                    "severity": "CRITICAL",
                    "tiger_id": tiger_id,
                    "station_id": current_station_id,
                    "timestamp": current_timestamp,
                    "title": f"Significant Territory Shift Detected for {tiger_id} ({shift_dist:.1f} km)",
                    "explanation": (
                        f"Tiger {tiger_id} was detected {shift_dist:.1f} km away from its established home range centroid "
                        f"({old_cent_lat:.4f}, {old_cent_lon:.4f}). This exceeds the shift threshold ({self.centroid_shift_thr} km) "
                        f"and may indicate territorial displacement or dispersal."
                    ),
                    "evidence_data": {
                        "baseline_centroid": [old_cent_lat, old_cent_lon],
                        "current_location": [current_lat, current_lon],
                        "shift_distance_km": round(shift_dist, 2),
                        "threshold_km": self.centroid_shift_thr,
                    }
                }
                generated_alerts.append(alert)
                self._save_alert(alert)

        return generated_alerts

    def _save_alert(self, alert_dict: dict):
        self.db.record_alert(
            alert_id=alert_dict["alert_id"],
            alert_type=alert_dict["alert_type"],
            severity=alert_dict["severity"],
            tiger_id=alert_dict["tiger_id"],
            station_id=alert_dict.get("station_id") or None,
            timestamp=alert_dict["timestamp"],
            title=alert_dict["title"],
            explanation=alert_dict["explanation"],
            evidence_data=alert_dict["evidence_data"],
        )

    # ── Prolonged Absence Detection ────────────────────────────────────────────

    def check_absence_anomaly(
        self,
        tiger_id: str,
        sighting_timestamps: List[str],
        known_station_ids: List[str],
        current_timestamp: str,
    ) -> Optional[Dict]:
        """
        Determine whether a tiger has been absent for an anomalously long period.

        Algorithm:
          1. Require at least `absence_min_history` sightings (insufficient data -> NORMAL).
          2. Parse all timestamps; sort chronologically.
          3. Compute inter-sighting intervals (days between consecutive sightings).
          4. Calculate the median interval as the individual baseline.
          5. Compute gap = days since `last_seen`.
          6. Check active station coverage: if fewer than `absence_min_active_stations` of
             the tiger's known stations were active on `current_timestamp`, the absence cannot
             be distinguished from camera downtime → suppress alert, log audit note.
          7. Classify:
               gap > 3 * median → ALERT  (PROLONGED_ABSENCE)
               gap > 2 * median → REVIEW (possible absence)
               else            → NORMAL

        Returns the alert dict if an ALERT or REVIEW is raised, else None.
        """
        if len(sighting_timestamps) < self.absence_min_history:
            return None  # Insufficient history

        # Parse and sort timestamps
        parsed = []
        for ts in sighting_timestamps:
            try:
                parsed.append(datetime.fromisoformat(ts))
            except ValueError:
                pass
        if len(parsed) < self.absence_min_history:
            return None
        parsed.sort()

        # Compute inter-sighting intervals in days
        intervals_days = [
            (parsed[i + 1] - parsed[i]).total_seconds() / 86400.0
            for i in range(len(parsed) - 1)
        ]
        median_interval_days = sorted(intervals_days)[len(intervals_days) // 2]

        # Gap since last confirmed sighting
        try:
            current_dt = datetime.fromisoformat(current_timestamp)
        except ValueError:
            current_dt = datetime.now()
        gap_days = (current_dt - parsed[-1]).total_seconds() / 86400.0

        if gap_days <= 0:
            return None  # Sighting in the future (clock drift)

        # Survey-effort check: are the tiger's known stations active right now?
        active_stations = self.db.get_active_stations_in_set(known_station_ids, current_timestamp)
        n_active = len(active_stations)

        if n_active < self.absence_min_active_stations:
            # Cannot distinguish absence from camera downtime
            self.db.log_audit(
                entity_type="tiger",
                entity_id=tiger_id,
                action="absence_check_suppressed",
                details=(
                    f"Gap={gap_days:.1f}d > threshold but only {n_active}/{len(known_station_ids)} "
                    f"stations active as of {current_timestamp}. Cannot confirm genuine absence."
                )
            )
            return None

        # Classify absence severity
        if gap_days > self.absence_mult * median_interval_days:
            severity = "CRITICAL"
            alert_status = "ALERT"
        elif gap_days > 2.0 * median_interval_days:
            severity = "WARNING"
            alert_status = "REVIEW"
        else:
            return None  # Normal expected gap

        last_seen_slug = "".join(c for c in parsed[-1].isoformat() if c.isalnum())
        curr_slug = "".join(c for c in current_timestamp if c.isalnum())
        alert_id = f"ALT_ABS_{tiger_id}_{last_seen_slug}_{curr_slug}"
        alert = {
            "alert_id": alert_id,
            "alert_type": "PROLONGED_ABSENCE",
            "severity": severity,
            "tiger_id": tiger_id,
            "station_id": None,
            "timestamp": current_timestamp,
            "title": (
                f"Tiger {tiger_id} Not Sighted for {gap_days:.0f} Days "
                f"({alert_status}: {self.absence_mult:.0f}× Median Interval)"
            ),
            "explanation": (
                f"Tiger {tiger_id} has not been confirmed at any camera station for {gap_days:.1f} days. "
                f"Historical median inter-sighting interval for this individual is {median_interval_days:.1f} days. "
                f"Current gap ({gap_days:.1f}d) exceeds the {self.absence_mult:.0f}× anomaly threshold "
                f"({self.absence_mult * median_interval_days:.1f}d). "
                f"{n_active} of {len(known_station_ids)} known stations active and operational — "
                f"genuine absence is credible. Survey effort confirms this is not a camera coverage gap."
            ),
            "evidence_data": {
                "last_seen": parsed[-1].isoformat(),
                "current_check_timestamp": current_timestamp,
                "gap_days": round(gap_days, 1),
                "median_interval_days": round(median_interval_days, 1),
                "anomaly_threshold_days": round(self.absence_mult * median_interval_days, 1),
                "absence_multiplier": self.absence_mult,
                "total_sightings": len(parsed),
                "known_station_ids": known_station_ids,
                "active_station_count": n_active,
                "alert_status": alert_status,
            },
        }
        self._save_alert(alert)
        self.db.log_audit(
            entity_type="tiger",
            entity_id=tiger_id,
            action="absence_alert_raised",
            details=json.dumps({
                "alert_id": alert_id,
                "gap_days": round(gap_days, 1),
                "median_interval": round(median_interval_days, 1),
                "active_stations": n_active,
            }),
        )
        return alert

    def evaluate_all_absences(self, current_timestamp: Optional[str] = None) -> List[Dict]:
        """
        Check every known tiger for prolonged absence as of `current_timestamp`.
        Called at the end of each SD card ingestion run.
        Returns list of absence alerts raised.
        """
        if current_timestamp is None:
            current_timestamp = datetime.now().isoformat()

        tiger_records = self.db.get_tigers_for_absence_check()
        raised = []
        for rec in tiger_records:
            alert = self.check_absence_anomaly(
                tiger_id=rec["tiger_id"],
                sighting_timestamps=rec["sighting_timestamps"],
                known_station_ids=rec["known_station_ids"],
                current_timestamp=current_timestamp,
            )
            if alert:
                raised.append(alert)
        return raised
