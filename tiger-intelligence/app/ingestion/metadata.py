"""
metadata.py — EXIF Parsing & Camera Trap Data Quality Layer
Pench Tiger Reserve Camera Trap Intelligence System

Handles field realities:
  - Clock drift / reset timestamps (e.g. 1970/2000 default date)
  - Missing GPS & station coordinates lookup
  - Time sequence reversals within bursts
  - Audit status & data quality flagging
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from PIL import ExifTags, Image

# Known reference grid coordinates for Pench Tiger Reserve stations
PENCH_DEFAULT_STATIONS = {
    "C01": {"lat": 21.7150, "lon": 79.3120, "zone": "Core", "village_km": 8.2, "buffer_km": 14.5},
    "C02": {"lat": 21.7280, "lon": 79.3350, "zone": "Core", "village_km": 6.8, "buffer_km": 12.1},
    "C03": {"lat": 21.7450, "lon": 79.3180, "zone": "Core", "village_km": 7.5, "buffer_km": 13.0},
    "C04": {"lat": 21.7620, "lon": 79.3490, "zone": "Buffer", "village_km": 3.4, "buffer_km": 5.2},
    "C05": {"lat": 21.7810, "lon": 79.3720, "zone": "Corridor", "village_km": 1.9, "buffer_km": 2.8},
    "C06": {"lat": 21.7010, "lon": 79.2900, "zone": "Core", "village_km": 9.1, "buffer_km": 15.2},
    "C07": {"lat": 21.7330, "lon": 79.3600, "zone": "Core", "village_km": 5.5, "buffer_km": 10.4},
    "C42": {"lat": 21.7950, "lon": 79.3850, "zone": "Fringe", "village_km": 1.2, "buffer_km": 1.8},
    "STN01": {"lat": 21.7150, "lon": 79.3120, "zone": "Core", "village_km": 8.2, "buffer_km": 14.5},
    "STN02": {"lat": 21.7280, "lon": 79.3350, "zone": "Core", "village_km": 6.8, "buffer_km": 12.1},
    "STN03": {"lat": 21.7450, "lon": 79.3180, "zone": "Core", "village_km": 7.5, "buffer_km": 13.0},
    "STN04": {"lat": 21.7620, "lon": 79.3490, "zone": "Buffer", "village_km": 3.4, "buffer_km": 5.2},
    "STN05": {"lat": 21.7810, "lon": 79.3720, "zone": "Corridor", "village_km": 1.9, "buffer_km": 2.8},
    "STN06": {"lat": 21.7010, "lon": 79.2900, "zone": "Core", "village_km": 9.1, "buffer_km": 15.2},
    "CAM_FIELD_01": {"lat": 21.7200, "lon": 79.3250, "zone": "Core", "village_km": 7.0, "buffer_km": 12.0},
}


def _get_decimal_from_dms(dms, ref):
    degrees = float(dms[0])
    minutes = float(dms[1]) / 60.0
    seconds = float(dms[2]) / 3600.0
    if ref in ['S', 'W']:
        degrees = -degrees
        minutes = -minutes
        seconds = -seconds
    return degrees + minutes + seconds


def extract_gps(exif_dict: dict) -> Tuple[Optional[float], Optional[float]]:
    """Extract decimal lat/lon from EXIF GPSInfo tags if present."""
    gps_info = exif_dict.get("GPSInfo")
    if not gps_info:
        return None, None

    try:
        lat = _get_decimal_from_dms(gps_info[2], gps_info[1])
        lon = _get_decimal_from_dms(gps_info[4], gps_info[3])
        return round(lat, 6), round(lon, 6)
    except Exception:
        return None, None


def extract_metadata(file_path: Path, station_id: str) -> Dict:
    """
    Extract EXIF metadata and analyze data quality flags.
    """
    quality_flags: List[str] = []
    timestamp_str: Optional[str] = None
    make_model = "Unknown Camera"
    lat, lon = None, None

    try:
        with Image.open(str(file_path)) as img:
            exif_raw = img._getexif()
            if exif_raw:
                exif = {
                    ExifTags.TAGS.get(k, k): v
                    for k, v in exif_raw.items()
                    if k in ExifTags.TAGS
                }
                # Camera Model
                make = str(exif.get("Make", "")).strip()
                model = str(exif.get("Model", "")).strip()
                if make or model:
                    make_model = f"{make} {model}".strip()

                # DateTime
                dt_val = exif.get("DateTimeOriginal") or exif.get("DateTime")
                if dt_val:
                    try:
                        dt = datetime.strptime(str(dt_val), "%Y:%m:%d %H:%M:%S")
                        timestamp_str = dt.isoformat()

                        # Clock drift / reset check
                        if dt.year < 2020:
                            quality_flags.append("timestamp_reset_suspected_pre2020")
                        elif dt.year > 2027:
                            quality_flags.append("timestamp_future_clock_drift")
                    except Exception:
                        quality_flags.append("timestamp_parse_error")
                else:
                    quality_flags.append("timestamp_missing_in_exif")

                # GPS from EXIF
                lat, lon = extract_gps(exif)
            else:
                quality_flags.append("no_exif_data")
    except Exception as e:
        quality_flags.append(f"metadata_read_error: {e}")

    # Fallback timestamp from file modification date if missing
    if not timestamp_str:
        mtime = file_path.stat().st_mtime
        timestamp_str = datetime.fromtimestamp(mtime).isoformat()
        quality_flags.append("timestamp_inferred_from_file_mtime")

    # Station coordinates fallback if camera GPS is not built-in (standard for field traps)
    if lat is None or lon is None:
        station_info = PENCH_DEFAULT_STATIONS.get(station_id, PENCH_DEFAULT_STATIONS["CAM_FIELD_01"])
        lat = station_info["lat"]
        lon = station_info["lon"]
        quality_flags.append("gps_inferred_from_station_registry")
    else:
        quality_flags.append("gps_verified_exif")

    return {
        "timestamp": timestamp_str,
        "camera_model": make_model,
        "latitude": lat,
        "longitude": lon,
        "quality_flags": quality_flags,
    }


def analyze_sequence_health(records: List[Dict]) -> List[Dict]:
    """
    Check for sequence anomalies (e.g. camera clock jumping backwards).
    """
    by_station: Dict[str, List[Dict]] = {}
    for r in records:
        stn = r["inferred_camera_id"]
        by_station.setdefault(stn, []).append(r)

    for stn, stn_records in by_station.items():
        # Sort by filename
        stn_records.sort(key=lambda x: x["file_name"])
        prev_dt = None
        for rec in stn_records:
            curr_ts = rec.get("timestamp")
            if curr_ts:
                try:
                    curr_dt = datetime.fromisoformat(curr_ts)
                    if prev_dt and curr_dt < prev_dt:
                        flags = rec.setdefault("quality_flags", [])
                        if "timestamp_sequence_reversal" not in flags:
                            flags.append("timestamp_sequence_reversal")
                    prev_dt = curr_dt
                except Exception:
                    pass

    return records
