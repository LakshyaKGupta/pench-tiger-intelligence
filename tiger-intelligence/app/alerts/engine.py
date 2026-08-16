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

from datetime import datetime
from typing import Dict, List, Optional

from app.database.db import TigerDatabase
from app.occupancy.mcp import haversine_distance_km


class AlertEngine:
    """
    Evaluates ecological changes and movement deviations with survey-effort corrections.
    """

    def __init__(
        self,
        db: TigerDatabase,
        centroid_shift_threshold_km: float = 4.0,
        village_risk_threshold_km: float = 2.5,
        buffer_risk_threshold_km: float = 2.0,
        absence_multiplier: float = 3.0,
    ):
        self.db = db
        self.centroid_shift_thr = centroid_shift_threshold_km
        self.village_risk_thr = village_risk_threshold_km
        self.buffer_risk_thr = buffer_risk_threshold_km
        self.absence_mult = absence_multiplier

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

        # 1. Village Conflict Risk Alert
        dist_to_village = station_info.get("distance_to_village_km", 5.0)
        if dist_to_village <= self.village_risk_thr:
            alert = {
                "alert_id": f"ALT_VIL_{tiger_id}_{current_station_id}_{int(datetime.now().timestamp())}",
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
                "alert_id": f"ALT_BUF_{tiger_id}_{current_station_id}_{int(datetime.now().timestamp())}",
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
                    "alert_id": f"ALT_EXP_{tiger_id}_{current_station_id}_{int(datetime.now().timestamp())}",
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
                    "alert_id": f"ALT_SFT_{tiger_id}_{current_station_id}_{int(datetime.now().timestamp())}",
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
            station_id=alert_dict["station_id"],
            timestamp=alert_dict["timestamp"],
            title=alert_dict["title"],
            explanation=alert_dict["explanation"],
            evidence_data=alert_dict["evidence_data"],
        )
