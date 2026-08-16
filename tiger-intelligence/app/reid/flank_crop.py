"""
flank_crop.py — Tiger Body & Flank ROI Extraction & Orientation Estimator
Pench Tiger Reserve Camera Trap Intelligence System
"""

from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np
from PIL import Image


def crop_tiger_flank(
    image_path: str,
    bbox_xyxy: Tuple[int, int, int, int],
    output_crop_dir: Optional[str] = "tiger-intelligence/data/processed/crops",
    pad_ratio: float = 0.05,
) -> Tuple[Optional[str], Optional[np.ndarray], str]:
    """
    Extract tiger body crop with padding, determine orientation (left/right/ambiguous),
    and save crop image to disk.

    Returns:
        (saved_crop_path, crop_rgb_array, flank_orientation)
    """
    try:
        img_pil = Image.open(image_path).convert("RGB")
        w, h = img_pil.size
        x1, y1, x2, y2 = bbox_xyxy

        # Apply boundary padding
        pad_x = int((x2 - x1) * pad_ratio)
        pad_y = int((y2 - y1) * pad_ratio)

        x1_pad = max(0, x1 - pad_x)
        y1_pad = max(0, y1 - pad_y)
        x2_pad = min(w, x2 + pad_x)
        y2_pad = min(h, y2 + pad_y)

        crop_pil = img_pil.crop((x1_pad, y1_pad, x2_pad, y2_pad))
        crop_np = np.array(crop_pil)

        # Estimate flank orientation (Aspect ratio & horizontal profile)
        crop_w, crop_h = crop_pil.size
        aspect = crop_w / max(1, crop_h)

        # In camera trap photos, broadside tigers (aspect > 1.2) exhibit clear lateral flank stripes
        if aspect >= 1.1:
            # Check left vs right brightness/gradient distribution
            left_half = crop_np[:, :crop_w // 2]
            right_half = crop_np[:, crop_w // 2:]
            # Heuristic default to lateral flank
            orientation = "left_flank" if left_half.mean() > right_half.mean() else "right_flank"
        else:
            orientation = "frontal_or_ambiguous"

        saved_path = None
        if output_crop_dir:
            out_dir = Path(output_crop_dir)
            out_dir.mkdir(parents=True, exist_ok=True)
            stem = Path(image_path).stem
            saved_path = str(out_dir / f"crop_{stem}.jpg")
            crop_pil.save(saved_path, quality=95)

        return saved_path, crop_np, orientation
    except Exception as e:
        print(f"Error cropping flank: {e}")
        return None, None, "error"
