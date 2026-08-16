"""
flank_crop.py — Deterministic Dual-Candidate Body ROI Crop Generator
Pench Tiger Reserve Camera Trap Intelligence System

Extracts candidate body/flank regions from a detected tiger bounding box:
  - Excludes approximately the upper head region (~20% from top)
  - Excludes lower leg/ground region (~15% from bottom)
  - Generates deterministic left, right, and full body ROI candidates
  - Note: These crops are geometric ROI approximations for metric feature extraction,
    not anatomically verified keypoint masks.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image


@dataclass
class FlankCandidate:
    crop_type: str  # 'left_candidate', 'right_candidate', 'body_candidate'
    crop_path: Optional[str]
    crop_array: np.ndarray
    bbox_in_image: Tuple[int, int, int, int]


def generate_flank_candidates(
    image_path: str,
    bbox_xyxy: Tuple[int, int, int, int],
    output_crop_dir: Optional[str] = "tiger-intelligence/data/processed/crops",
    head_exclusion_ratio: float = 0.20,
    leg_exclusion_ratio: float = 0.15,
) -> List[FlankCandidate]:
    """
    Deterministically extract left, right, and full body ROI candidates from a tiger detection.

    Args:
        image_path: Path to raw or working image.
        bbox_xyxy: (x1, y1, x2, y2) bounding box from tiger detector.
        output_crop_dir: Directory to save generated crop images.
        head_exclusion_ratio: Fractional height removed from top to exclude head.
        leg_exclusion_ratio: Fractional height removed from bottom to exclude legs.

    Returns:
        List of FlankCandidate objects (body_candidate, left_candidate, right_candidate).
    """
    candidates: List[FlankCandidate] = []
    try:
        img_pil = Image.open(image_path).convert("RGB")
        img_w, img_h = img_pil.size
        x1, y1, x2, y2 = bbox_xyxy

        # Constrain bbox within image bounds
        x1 = max(0, min(x1, img_w - 1))
        y1 = max(0, min(y1, img_h - 1))
        x2 = max(x1 + 10, min(x2, img_w))
        y2 = max(y1 + 10, min(y2, img_h))

        box_w = x2 - x1
        box_h = y2 - y1

        # Torso vertical boundaries (excluding head and legs)
        y_top = int(y1 + head_exclusion_ratio * box_h)
        y_bottom = int(y2 - leg_exclusion_ratio * box_h)

        # Fallback if box is too small
        if y_bottom <= y_top:
            y_top = y1
            y_bottom = y2

        # 1. Full Body / Torso Candidate
        crop_body_pil = img_pil.crop((x1, y_top, x2, y_bottom))
        candidates.append(
            _save_and_build_candidate(
                crop_body_pil, "body_candidate", image_path, output_crop_dir, (x1, y_top, x2, y_bottom)
            )
        )

        # 2. Left-biased Candidate (Left ~65% of torso width)
        x_left_end = min(x2, int(x1 + 0.65 * box_w))
        crop_left_pil = img_pil.crop((x1, y_top, x_left_end, y_bottom))
        candidates.append(
            _save_and_build_candidate(
                crop_left_pil, "left_candidate", image_path, output_crop_dir, (x1, y_top, x_left_end, y_bottom)
            )
        )

        # 3. Right-biased Candidate (Right ~65% of torso width)
        x_right_start = max(x1, int(x2 - 0.65 * box_w))
        crop_right_pil = img_pil.crop((x_right_start, y_top, x2, y_bottom))
        candidates.append(
            _save_and_build_candidate(
                crop_right_pil, "right_candidate", image_path, output_crop_dir, (x_right_start, y_top, x2, y_bottom)
            )
        )

    except Exception as e:
        print(f"Error generating flank candidates for {image_path}: {e}")

    return candidates


def _save_and_build_candidate(
    crop_pil: Image.Image,
    crop_type: str,
    orig_path: str,
    output_dir: Optional[str],
    coords: Tuple[int, int, int, int]
) -> FlankCandidate:
    saved_path = None
    if output_dir:
        out_d = Path(output_dir)
        out_d.mkdir(parents=True, exist_ok=True)
        stem = Path(orig_path).stem
        saved_path = str(out_d / f"{stem}_{crop_type}.jpg")
        crop_pil.save(saved_path, quality=95)

    return FlankCandidate(
        crop_type=crop_type,
        crop_path=saved_path,
        crop_array=np.array(crop_pil),
        bbox_in_image=coords,
    )


# Backward-compatible wrapper
def crop_tiger_flank(
    image_path: str,
    bbox_xyxy: Tuple[int, int, int, int],
    output_crop_dir: Optional[str] = "tiger-intelligence/data/processed/crops",
    pad_ratio: float = 0.05,
) -> Tuple[Optional[str], Optional[np.ndarray], str]:
    """Backward-compatible single-flank extractor returning the primary torso candidate."""
    candidates = generate_flank_candidates(image_path, bbox_xyxy, output_crop_dir)
    if candidates:
        primary = candidates[0]
        return primary.crop_path, primary.crop_array, primary.crop_type
    return None, None, "error"
