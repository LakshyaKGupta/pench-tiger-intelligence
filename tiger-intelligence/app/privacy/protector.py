"""
protector.py — Human Privacy Protection & Face Masking Engine
Pench Tiger Reserve Camera Trap Intelligence System

Ensures:
  1. Human detections have bounding box regions blurred automatically.
  2. Human frames are segregated into restricted access storage.
  3. No raw unmasked human images are displayed in public dashboard views.
"""

import shutil
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np


def apply_privacy_blur(
    image_path: str,
    human_boxes: List[Tuple[int, int, int, int]],
    output_blurred_path: Optional[str] = None,
    blur_kernel_size: int = 51,
) -> str:
    """
    Apply heavy Gaussian blur to all human bounding boxes in the image.
    Saves and returns the anonymized image path.
    """
    img = cv2.imread(image_path)
    if img is None:
        return image_path

    h, w, _ = img.shape

    for (x1, y1, x2, y2) in human_boxes:
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(w, x2)
        y2 = min(h, y2)

        roi = img[y1:y2, x1:x2]
        if roi.size > 0:
            # Ensure kernel size is odd
            k = blur_kernel_size if blur_kernel_size % 2 == 1 else blur_kernel_size + 1
            blurred_roi = cv2.GaussianBlur(roi, (k, k), 30)
            img[y1:y2, x1:x2] = blurred_roi

    if not output_blurred_path:
        out_dir = Path("tiger-intelligence/data/processed/anonymized")
        out_dir.mkdir(parents=True, exist_ok=True)
        output_blurred_path = str(out_dir / f"anon_{Path(image_path).name}")

    cv2.imwrite(output_blurred_path, img)
    return output_blurred_path


def quarantine_human_frame(
    image_path: str,
    human_quarantine_dir: str = "tiger-intelligence/data/quarantine/human_review"
) -> str:
    """Move raw unmasked human image to restricted quarantine directory."""
    dest_dir = Path(human_quarantine_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_file = dest_dir / Path(image_path).name

    # Collision safe move
    counter = 1
    stem, suffix = dest_file.stem, dest_file.suffix
    while dest_file.exists():
        dest_file = dest_dir / f"{stem}_dup{counter}{suffix}"
        counter += 1

    shutil.move(image_path, str(dest_file))
    return str(dest_file)
