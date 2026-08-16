"""
validator.py — High-Performance Parallel Image Integrity & Corruption Checker
Pench Tiger Reserve Camera Trap Intelligence System
"""

import os
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
from PIL import Image

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}


def check_single_image(filepath: str) -> Tuple[str, bool, str]:
    """
    Perform triple-layer decode check on a single image.
    1. PIL verify (header)
    2. PIL load (pixel raster)
    3. OpenCV decode (native C++ decoder)
    """
    # 1. PIL verify
    try:
        with Image.open(filepath) as img:
            img.verify()
    except Exception as e:
        return filepath, False, f"PIL verify failed: {e}"

    # 2. PIL load
    try:
        with Image.open(filepath) as img:
            img.load()
    except Exception as e:
        return filepath, False, f"PIL load failed: {e}"

    # 3. OpenCV decode
    try:
        mat = cv2.imread(filepath)
        if mat is None:
            return filepath, False, "OpenCV returned None (unreadable frame)"
    except Exception as e:
        return filepath, False, f"OpenCV decode exception: {e}"

    return filepath, True, "ok"


def validate_image_batch(
    image_paths: List[str],
    num_workers: Optional[int] = None
) -> Dict[str, Tuple[bool, str]]:
    """
    Validate a list of image paths in parallel.
    Returns: {filepath: (is_valid, reason)}
    """
    workers = num_workers or min(32, os.cpu_count() or 4)
    results: Dict[str, Tuple[bool, str]] = {}

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(check_single_image, p): p for p in image_paths}
        for future in as_completed(futures):
            fpath, is_valid, reason = future.result()
            results[fpath] = (is_valid, reason)

    return results
