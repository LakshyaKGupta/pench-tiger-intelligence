"""
scanner.py — Recursive SD Card Scanner & Dataset Ingestion
Pench Tiger Reserve Camera Trap Intelligence System

Handles arbitrary nested folder structures, camera-specific directories,
and unorganized field dumps. Normalizes every image into a standardized record.
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Optional

SUPPORTED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}


def infer_camera_id_from_path(file_path: Path) -> str:
    """
    Heuristically extract camera/station ID from folder name or filename.
    Examples:
      - 'SD_CARD/Camera_17/DSC_001.JPG' -> 'CAM_17'
      - 'Pench_Grids/C-04/IMG_0023.JPG' -> 'C-04'
      - 'Station_B02/100MEDIA/IMG_01.JPG' -> 'STN_B02'
    """
    parts = list(file_path.parts)
    
    # 1. Look for camera patterns in folder names
    for part in reversed(parts[:-1]):
        # Match 'Camera_17', 'Cam-04', 'C07', 'Station_12', 'STN_A01'
        m = re.search(r'(camera[_\-\s]*\d+|cam[_\-\s]*\d+|stn[_\-\s]*[A-Za-z0-9]+|station[_\-\s]*[A-Za-z0-9]+|[A-Z]\d{2,3})', part, re.IGNORECASE)
        if m:
            clean_id = m.group(1).upper().replace(" ", "_")
            return clean_id

    # 2. Look for camera patterns in filename prefix
    fname = file_path.stem
    m = re.match(r'^(C\d{2,3}|CAM\d+|STN\d+)[_\-]', fname, re.IGNORECASE)
    if m:
        return m.group(1).upper()

    # Default fallback to parent folder name or 'CAM_UNKNOWN'
    parent_name = file_path.parent.name
    if parent_name and parent_name.upper() not in ("DCIM", "100MEDIA", "IMAGES", "DATA", "RAW"):
        return f"CAM_{parent_name.upper()}"

    return "CAM_FIELD_01"


def scan_dataset(root_dir: str) -> List[Dict]:
    """
    Recursively discover all image files in root_dir.
    
    Returns list of normalized image dictionaries:
    [
        {
            "image_id": "IMG_0032_CAM17",
            "original_path": "/path/to/IMG_0032.JPG",
            "file_name": "IMG_0032.JPG",
            "file_size_bytes": 1946045,
            "source_folder": "DCIM/100MEDIA",
            "inferred_camera_id": "CAM_17",
            "file_path": Path(...)
        },
        ...
    ]
    """
    root_path = Path(root_dir)
    if not root_path.exists():
        raise FileNotFoundError(f"Input directory does not exist: {root_dir}")

    discovered: List[Dict] = []
    seen_ids: Dict[str, int] = {}

    all_files = sorted([
        p for p in root_path.rglob("*")
        if p.is_file() and p.suffix.lower() in SUPPORTED_IMAGE_EXTS
    ])

    for file_path in all_files:
        cam_id = infer_camera_id_from_path(file_path)
        try:
            rel_folder = str(file_path.parent.relative_to(root_path))
        except ValueError:
            rel_folder = file_path.parent.name

        base_id = file_path.stem
        # Ensure unique image_id even across identical filenames on different cards
        unique_key = f"{cam_id}_{base_id}"
        if unique_key in seen_ids:
            seen_ids[unique_key] += 1
            image_id = f"{unique_key}_v{seen_ids[unique_key]}"
        else:
            seen_ids[unique_key] = 1
            image_id = unique_key

        record = {
            "image_id": image_id,
            "original_path": str(file_path.resolve()),
            "file_name": file_path.name,
            "file_size_bytes": file_path.stat().st_size,
            "source_folder": rel_folder if rel_folder != "." else "ROOT",
            "inferred_camera_id": cam_id,
            "file_path": file_path,
        }
        discovered.append(record)

    return discovered
