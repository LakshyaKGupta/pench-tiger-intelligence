"""
detector.py — Camera Trap Subject Detector (MegaDetector & Wildlife Standard)
Pench Tiger Reserve Camera Trap Intelligence System

Separates:
  1. Animals -> Proceed to Species Classifier / Tiger Pipeline
  2. Humans -> Flag for Privacy Blur & Human Audit
  3. Vehicles -> Security Logging
  4. Blanks -> Conservative Reversible Quarantine
"""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
from ultralytics import YOLO

# COCO / MegaDetector category mapping
HUMAN_CLASS_ID = 0
ANIMAL_CLASS_IDS = {14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 77}
VEHICLE_CLASS_IDS = {1, 2, 3, 4, 5, 6, 7, 8}


@dataclass
class DetectionBox:
    box_id: str
    class_id: int
    class_name: str
    confidence: float
    bbox_xyxy: Tuple[int, int, int, int]  # (x1, y1, x2, y2)
    is_animal: bool
    is_human: bool
    is_vehicle: bool


@dataclass
class ImageDetectionResult:
    image_path: str
    is_blank: bool
    has_animal: bool
    has_human: bool
    has_vehicle: bool
    top_class: str
    top_confidence: float
    boxes: List[DetectionBox]


class CameraTrapDetector:
    """High-speed subject detector for camera trap triage."""

    def __init__(
        self,
        model_path: str = "tiger-intelligence/models/yolov8n.pt",
        confidence_threshold: float = 0.20,
        batch_size: int = 16,
        imgsz: int = 640,
    ):
        self.model_path = Path(model_path)
        if not self.model_path.exists():
            raise FileNotFoundError(f"Detector model not found at {model_path}")
        
        self.conf_threshold = confidence_threshold
        self.batch_size = batch_size
        self.imgsz = imgsz
        
        # Load YOLO model
        self.model = YOLO(str(self.model_path))

    def detect_batch(self, image_paths: List[str]) -> List[ImageDetectionResult]:
        """
        Run batched detection on list of image paths.
        """
        if not image_paths:
            return []

        results: List[ImageDetectionResult] = []
        raw_outputs = self.model.predict(
            source=image_paths,
            conf=self.conf_threshold,
            batch=self.batch_size,
            imgsz=self.imgsz,
            verbose=False,
            stream=True
        )

        for img_path, out in zip(image_paths, raw_outputs):
            boxes: List[DetectionBox] = []
            has_animal = False
            has_human = False
            has_vehicle = False
            top_class = "blank"
            top_conf = 0.0

            for i, box in enumerate(out.boxes or []):
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                cls_name = out.names.get(cls_id, str(cls_id))
                xyxy = tuple(box.xyxy[0].cpu().numpy().astype(int))

                is_human = (cls_id == HUMAN_CLASS_ID)
                is_animal = (cls_id in ANIMAL_CLASS_IDS) or (not is_human and cls_id not in VEHICLE_CLASS_IDS)
                is_vehicle = (cls_id in VEHICLE_CLASS_IDS)

                if is_human:
                    has_human = True
                if is_animal:
                    has_animal = True
                if is_vehicle:
                    has_vehicle = True

                if conf > top_conf:
                    top_conf = conf
                    top_class = cls_name

                det_box = DetectionBox(
                    box_id=f"box_{i}",
                    class_id=cls_id,
                    class_name=cls_name,
                    confidence=conf,
                    bbox_xyxy=xyxy,
                    is_animal=is_animal,
                    is_human=is_human,
                    is_vehicle=is_vehicle,
                )
                boxes.append(det_box)

            is_blank = not (has_animal or has_human or has_vehicle)

            res = ImageDetectionResult(
                image_path=img_path,
                is_blank=is_blank,
                has_animal=has_animal,
                has_human=has_human,
                has_vehicle=has_vehicle,
                top_class=top_class if not is_blank else "blank",
                top_confidence=top_conf,
                boxes=boxes,
            )
            results.append(res)

        return results
