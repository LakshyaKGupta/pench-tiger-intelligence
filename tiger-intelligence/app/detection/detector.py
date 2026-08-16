"""
detector.py — Camera Trap Subject Detector (MegaDetector V6 & Wildlife Standard)
Pench Tiger Reserve Camera Trap Intelligence System

Separates camera-trap frames into:
  1. Animals -> Proceed to Species Classifier / Tiger Re-ID Pipeline
  2. Humans -> Flag for Human Review & Automatic Privacy Blur
  3. Vehicles -> Forest Department Patrol & Security Log
  4. Blanks -> Conservative Reversible Quarantine (Original files NEVER deleted)

Supports:
  - MegaDetector V6 (Native camera trap classes: 0: animal, 1: person, 2: vehicle)
  - YOLOv8 (COCO-80 Multi-Class with Wildlife Mapping)
  - Hardware Acceleration on Apple Silicon Metal (MPS), NVIDIA CUDA, and CPU
  - 100% Offline execution (zero network calls after local weights are installed)
"""

import importlib.machinery
import os
import shutil
import sys
import types
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import torch
from PIL import Image

# Suppress minor library warnings for clean CLI output
warnings.filterwarnings("ignore", category=UserWarning)

# Stub unused bioacoustics modules in PytorchWildlife to prevent import overhead/failures
for _mod in ["librosa", "soundfile", "torchaudio"]:
    if _mod not in sys.modules:
        _m = types.ModuleType(_mod)
        _m.__spec__ = importlib.machinery.ModuleSpec(_mod, None)
        sys.modules[_mod] = _m

# Native MegaDetector Category IDs
MEGADETECTOR_ANIMAL_ID = 0
MEGADETECTOR_PERSON_ID = 1
MEGADETECTOR_VEHICLE_ID = 2

# COCO Fallback Class Mappings (for standard YOLOv8 COCO models)
COCO_HUMAN_ID = 0
COCO_ANIMAL_IDS = {14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 77}
COCO_VEHICLE_IDS = {1, 2, 3, 4, 5, 6, 7, 8}


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
    """
    High-throughput offline Subject Detector for Camera Trap Triage.
    Integrates MegaDetector V6 (Zenodo MDV6) and YOLO architectures with Apple Silicon (MPS) acceleration.
    """

    def __init__(
        self,
        model_path: str = "tiger-intelligence/models/MDV6-mit-yolov9-c.ckpt",
        confidence_threshold: float = 0.20,
        batch_size: int = 16,
        imgsz: int = 640,
        device: Optional[str] = None,
    ):
        # Robust model path resolution
        candidate_path = Path(model_path)
        if not candidate_path.exists():
            pkg_models = Path(__file__).resolve().parent.parent.parent / "models" / candidate_path.name
            cwd_models = Path.cwd() / "models" / candidate_path.name
            tiger_models = Path.cwd() / "tiger-intelligence" / "models" / candidate_path.name
            for c in [pkg_models, cwd_models, tiger_models]:
                if c.exists():
                    candidate_path = c
                    break

        if not candidate_path.exists():
            # Fallback to YOLOv8n if available
            fallback_candidates = [
                Path(__file__).resolve().parent.parent.parent / "models" / "yolov8n.pt",
                Path.cwd() / "models" / "yolov8n.pt",
                Path.cwd() / "tiger-intelligence" / "models" / "yolov8n.pt",
            ]
            found_fallback = None
            for fb in fallback_candidates:
                if fb.exists():
                    found_fallback = fb
                    break

            if found_fallback and candidate_path.name != "yolov8n.pt":
                candidate_path = found_fallback
            else:
                raise FileNotFoundError(
                    f"FATAL: Camera trap detector weights not found at '{model_path}'. "
                    f"Ensure offline model weights are downloaded to the models/ directory."
                )

        self.model_path = candidate_path

        self.conf_threshold = confidence_threshold
        self.batch_size = batch_size
        self.imgsz = imgsz

        # Automatic hardware device selection
        if device is None:
            if torch.backends.mps.is_available():
                self.device = "mps"
            elif torch.cuda.is_available():
                self.device = "cuda"
            else:
                self.device = "cpu"
        else:
            self.device = device

        self.is_megadetector_ckpt = (
            self.model_path.suffix.lower() == ".ckpt"
            or "mdv6" in self.model_path.name.lower()
            or "md_v5" in self.model_path.name.lower()
        )

        if self.is_megadetector_ckpt:
            # Ensure local offline cache exists in torch hub dir
            hub_dir = Path(torch.hub.get_dir()) / "checkpoints"
            hub_dir.mkdir(parents=True, exist_ok=True)
            hub_ckpt = hub_dir / self.model_path.name
            if not hub_ckpt.exists():
                shutil.copy2(self.model_path, hub_ckpt)

            from PytorchWildlife.models.detection.yolo_mit.megadetectorv6_mit import MegaDetectorV6MIT

            try:
                self.md_model = MegaDetectorV6MIT(
                    weights=str(self.model_path),
                    device=self.device,
                    pretrained=False,
                    version="MDV6-mit-yolov9-c"
                )
                self.md_model.cfg.task.nms.min_confidence = self.conf_threshold
                self.md_model._load_model(weights=str(self.model_path), device=self.device, url=self.md_model.url)
                self.model_backend = "megadetector_v6"
            except Exception as e:
                # Fallback to CPU if MPS device initialization fails
                if self.device == "mps":
                    self.device = "cpu"
                    self.md_model = MegaDetectorV6MIT(
                        weights=str(self.model_path),
                        device="cpu",
                        pretrained=False,
                        version="MDV6-mit-yolov9-c"
                    )
                    self.md_model.cfg.task.nms.min_confidence = self.conf_threshold
                    self.md_model._load_model(weights=str(self.model_path), device="cpu", url=self.md_model.url)
                    self.model_backend = "megadetector_v6"
                else:
                    raise e
        else:
            from ultralytics import YOLO
            self.yolo_model = YOLO(str(self.model_path))
            self.model_backend = "yolov8"

    def detect_batch(self, image_paths: List[str]) -> List[ImageDetectionResult]:
        """
        Execute batched offline subject detection across a list of image paths.
        """
        if not image_paths:
            return []

        results: List[ImageDetectionResult] = []

        if self.model_backend == "megadetector_v6":
            for img_path in image_paths:
                boxes: List[DetectionBox] = []
                has_animal = False
                has_human = False
                has_vehicle = False
                top_class = "blank"
                top_conf = 0.0

                try:
                    im_pil = Image.open(img_path).convert("RGB")
                    image_tensor, _, rev_tensor = self.md_model.transform(im_pil)
                    image_tensor = image_tensor.to(self.device)[None]
                    rev_tensor = rev_tensor.to(self.device)[None]

                    with torch.no_grad():
                        preds = self.md_model.model(image_tensor)
                        det_results = self.md_model.post_proccess(preds, rev_tensor)

                    if det_results and len(det_results) > 0 and len(det_results[0]) > 0:
                        pred_boxes = det_results[0]
                        for i, row in enumerate(pred_boxes):
                            cls_id = int(row[0].item())
                            xyxy = tuple(row[1:5].cpu().numpy().astype(int))
                            conf = float(row[5].item())

                            if conf < self.conf_threshold:
                                continue

                            is_animal = (cls_id == MEGADETECTOR_ANIMAL_ID)
                            is_human = (cls_id == MEGADETECTOR_PERSON_ID)
                            is_vehicle = (cls_id == MEGADETECTOR_VEHICLE_ID)

                            cls_name = "animal" if is_animal else ("person" if is_human else ("vehicle" if is_vehicle else str(cls_id)))

                            if is_human:
                                has_human = True
                            if is_animal:
                                has_animal = True
                            if is_vehicle:
                                has_vehicle = True

                            if conf > top_conf:
                                top_conf = conf
                                top_class = cls_name

                            boxes.append(
                                DetectionBox(
                                    box_id=f"box_{i}",
                                    class_id=cls_id,
                                    class_name=cls_name,
                                    confidence=conf,
                                    bbox_xyxy=xyxy,
                                    is_animal=is_animal,
                                    is_human=is_human,
                                    is_vehicle=is_vehicle,
                                )
                            )
                except Exception:
                    # In case of corrupted JPEG or I/O error, treat as blank without crashing
                    pass

                is_blank = not (has_animal or has_human or has_vehicle)
                results.append(
                    ImageDetectionResult(
                        image_path=img_path,
                        is_blank=is_blank,
                        has_animal=has_animal,
                        has_human=has_human,
                        has_vehicle=has_vehicle,
                        top_class=top_class if not is_blank else "blank",
                        top_confidence=top_conf,
                        boxes=boxes,
                    )
                )

        else:
            # YOLOv8 Backend
            try:
                raw_outputs = self.yolo_model.predict(
                    source=image_paths,
                    conf=self.conf_threshold,
                    batch=self.batch_size,
                    imgsz=self.imgsz,
                    device=self.device,
                    verbose=False,
                    stream=True
                )
            except Exception:
                raw_outputs = self.yolo_model.predict(
                    source=image_paths,
                    conf=self.conf_threshold,
                    batch=self.batch_size,
                    imgsz=self.imgsz,
                    device="cpu",
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

                    is_human = (cls_id == COCO_HUMAN_ID)
                    is_vehicle = (cls_id in COCO_VEHICLE_IDS)
                    is_animal = (cls_id in COCO_ANIMAL_IDS) or (not is_human and not is_vehicle)

                    if is_human:
                        has_human = True
                    if is_animal:
                        has_animal = True
                    if is_vehicle:
                        has_vehicle = True

                    if conf > top_conf:
                        top_conf = conf
                        top_class = cls_name

                    boxes.append(
                        DetectionBox(
                            box_id=f"box_{i}",
                            class_id=cls_id,
                            class_name=cls_name,
                            confidence=conf,
                            bbox_xyxy=xyxy,
                            is_animal=is_animal,
                            is_human=is_human,
                            is_vehicle=is_vehicle,
                        )
                    )

                is_blank = not (has_animal or has_human or has_vehicle)
                results.append(
                    ImageDetectionResult(
                        image_path=img_path,
                        is_blank=is_blank,
                        has_animal=has_animal,
                        has_human=has_human,
                        has_vehicle=has_vehicle,
                        top_class=top_class if not is_blank else "blank",
                        top_confidence=top_conf,
                        boxes=boxes,
                    )
                )

        return results
