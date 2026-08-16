"""
classifier.py — Species Classifier & Tiger Localization Engine
Pench Tiger Reserve Camera Trap Intelligence System

Classifies detected fauna:
  - Confirmed Tiger (Panthera tigris) -> Routes to Flank Re-ID
  - Non-Target Wildlife (Leopard, Bear, Deer, Dhole, etc.) -> Ecological Catalog
"""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from ultralytics import YOLO


@dataclass
class TigerCandidate:
    image_path: str
    is_tiger: bool
    tiger_confidence: float
    bbox_xyxy: Optional[Tuple[int, int, int, int]]  # (x1, y1, x2, y2)
    secondary_model_confidence: float
    ensemble_confidence: float
    species_label: str


class SpeciesClassifier:
    """
    High-accuracy species classifier combining custom camera trap weights
    and low-light EnlightenGAN enhancement.
    """

    def __init__(
        self,
        model_a_path: str = "tiger-intelligence/models/best_yolov8.pt",
        model_b_path: Optional[str] = "tiger-intelligence/models/best_enlightengan_and_yolov8.pt",
        retain_threshold: float = 0.60,
        review_threshold: float = 0.30,
        batch_size: int = 16,
        imgsz: int = 640,
    ):
        self.model_a = YOLO(model_a_path)
        self.model_b = YOLO(model_b_path) if (model_b_path and Path(model_b_path).exists()) else None
        self.retain_thr = retain_threshold
        self.review_thr = review_threshold
        self.batch_size = batch_size
        self.imgsz = imgsz

    def classify_candidates(
        self,
        image_paths: List[str],
        stage1_labels: Optional[Dict[str, str]] = None
    ) -> List[TigerCandidate]:
        """
        Classify whether animal frames contain a tiger.
        """
        if not image_paths:
            return []

        stage1_labels = stage1_labels or {}
        results: List[TigerCandidate] = []

        # 1. Run Model A on all candidate images
        preds_a = self.model_a.predict(
            source=image_paths,
            conf=0.01,
            batch=self.batch_size,
            imgsz=self.imgsz,
            verbose=False,
            stream=True
        )

        conf_a_map: Dict[str, Tuple[float, Optional[Tuple[int, int, int, int]]]] = {}
        for img_p, out in zip(image_paths, preds_a):
            boxes = out.boxes or []
            if len(boxes) > 0:
                best_b = max(boxes, key=lambda b: float(b.conf[0]))
                conf = float(best_b.conf[0].item())
                xyxy = tuple(best_b.xyxy[0].cpu().numpy().astype(int))
                conf_a_map[img_p] = (conf, xyxy)
            else:
                conf_a_map[img_p] = (0.0, None)

        # 2. Smart Ensemble: Run Model B on uncertain frames [0.10, 0.70]
        uncertain_paths = [
            p for p in image_paths
            if 0.10 <= conf_a_map.get(p, (0.0, None))[0] <= 0.70
        ]

        conf_b_map: Dict[str, Tuple[float, Optional[Tuple[int, int, int, int]]]] = {}
        if self.model_b and uncertain_paths:
            preds_b = self.model_b.predict(
                source=uncertain_paths,
                conf=0.01,
                batch=self.batch_size,
                imgsz=self.imgsz,
                verbose=False,
                stream=True
            )
            for img_p, out in zip(uncertain_paths, preds_b):
                boxes = out.boxes or []
                if len(boxes) > 0:
                    best_b = max(boxes, key=lambda b: float(b.conf[0]))
                    conf = float(best_b.conf[0].item())
                    xyxy = tuple(best_b.xyxy[0].cpu().numpy().astype(int))
                    conf_b_map[img_p] = (conf, xyxy)
                else:
                    conf_b_map[img_p] = (0.0, None)

        # 3. Assemble results
        for p in image_paths:
            ca, box_a = conf_a_map.get(p, (0.0, None))
            cb, box_b = conf_b_map.get(p, (0.0, None))

            ens_conf = max(ca, cb)
            chosen_box = box_a if ca >= cb else (box_b or box_a)

            is_tiger = ens_conf >= self.review_thr
            species = "tiger" if is_tiger else stage1_labels.get(p, "non_target_fauna")

            results.append(
                TigerCandidate(
                    image_path=p,
                    is_tiger=is_tiger,
                    tiger_confidence=ens_conf,
                    bbox_xyxy=chosen_box,
                    secondary_model_confidence=cb,
                    ensemble_confidence=ens_conf,
                    species_label=species,
                )
            )

        return results
