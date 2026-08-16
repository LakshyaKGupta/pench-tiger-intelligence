"""
validate.py — Fast Parallel Pre-flight Image Validation
Pench Tiger Reserve Camera Trap Intelligence System

Uses multi-threaded PIL + OpenCV checks to catch corrupt / truncated images
at 100+ images/sec across all available CPU cores.
"""

import os
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List, Tuple

import cv2
from PIL import Image
from tqdm import tqdm

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def validate_image(filepath: str) -> Tuple[str, bool, str]:
    """
    Validate a single image file using PIL and OpenCV.

    Returns:
        (filepath, is_valid, reason)
    """
    # Check 1: PIL verify (header, magic bytes)
    try:
        with Image.open(filepath) as img:
            img.verify()
    except Exception as e:
        return filepath, False, f"PIL verify failed: {e}"

    # Check 2: PIL full decode (pixel stream)
    try:
        with Image.open(filepath) as img:
            img.load()
    except Exception as e:
        return filepath, False, f"PIL load failed: {e}"

    # Check 3: OpenCV decode (catches codec discrepancies)
    try:
        frame = cv2.imread(filepath)
        if frame is None:
            return filepath, False, "OpenCV returned None (unreadable frame)"
    except Exception as e:
        return filepath, False, f"OpenCV decode failed: {e}"

    return filepath, True, "ok"


def validate(image_folder: str, quarantine_dir: str, num_workers: int = None) -> List[dict]:
    """
    Validate all images in a folder (recursive) in parallel.

    Args:
        image_folder: Root folder to scan.
        quarantine_dir: Destination for corrupt files.
        num_workers: Worker threads (defaults to CPU core count).

    Returns:
        List of dicts with keys: path, dest, reason.
    """
    if num_workers is None:
        num_workers = min(32, os.cpu_count() or 4)

    corrupt_files: List[dict] = []
    quarantine_path = Path(quarantine_dir)
    quarantine_path.mkdir(parents=True, exist_ok=True)

    image_folder_path = Path(image_folder)
    all_files = [
        p for p in image_folder_path.rglob("*")
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    ]

    if not all_files:
        return corrupt_files

    # Parallel validation
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = {executor.submit(validate_image, str(p)): p for p in all_files}
        for future in futures:
            path_str, is_valid, reason = future.result()
            if not is_valid:
                p = Path(path_str)
                dest = _safe_move(p, quarantine_path)
                corrupt_files.append({
                    "path": path_str,
                    "dest": str(dest),
                    "reason": reason,
                })
                print(f"  [CORRUPT] {p.name} → quarantine | {reason}")

    return corrupt_files


def _safe_move(src: Path, dest_dir: Path) -> Path:
    """Move src to dest_dir, renaming on collision to avoid overwrites."""
    dest = dest_dir / src.name
    counter = 1
    stem, suffix = src.stem, src.suffix
    while dest.exists():
        dest = dest_dir / f"{stem}_dup{counter}{suffix}"
        counter += 1
    shutil.move(str(src), str(dest))
    return dest
