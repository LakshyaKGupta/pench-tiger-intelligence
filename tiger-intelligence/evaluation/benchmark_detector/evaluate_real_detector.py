"""
evaluate_real_detector.py — Empirical Benchmark on 100 Real Camera-Trap Frames
Pench Tiger Reserve Camera Trap Intelligence System

Evaluates:
  1. Real Wildlife Recall (Tigers, Bear, Birds in real field captures)
  2. Real Blank Precision (True empty frames with swaying vegetation, storm, night IR)
  3. Critical False Negative Rate (Endangered wildlife dropped into blank quarantine)
  4. Safe Triage Policy Routing (KEEP, REVIEW, QUARANTINE)
  5. Inference Throughput (img/s) on CPU and Apple Silicon MPS
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.detection.detector import CameraTrapDetector
from app.detection.triage import CameraTrapTriagePolicy, TriageAction


def run_real_detector_benchmark(
    ground_truth_path: Optional[str] = None,
    keep_threshold: float = 0.15,
    quarantine_threshold: float = 0.08,
) -> Dict:
    """
    Run empirical side-by-side benchmark of YOLOv8n vs MegaDetector V6 on 100 REAL camera-trap images.
    """
    gt_file = Path(ground_truth_path) if ground_truth_path else Path(__file__).parent / "real_ground_truth.json"

    if not gt_file.exists():
        raise FileNotFoundError(f"Real benchmark ground truth not found at {gt_file}")

    with open(gt_file, "r") as f:
        gt_records = json.load(f)

    image_paths = []
    for r in gt_records:
        p = Path(r["path"])
        if not p.exists():
            p = gt_file.parent / "real_images" / r["filename"]
        image_paths.append(str(p.resolve()))
    total_images = len(image_paths)

    total_animals = sum(1 for r in gt_records if r["true_category"] == "animal")
    total_blanks = sum(1 for r in gt_records if r["true_category"] == "blank")
    total_humans = sum(1 for r in gt_records if r["true_category"] == "person")

    print("\n" + "=" * 90)
    print("  GENUINE CAMERA-TRAP SUBJECT DETECTOR BENCHMARK (100 Real Field Captures)")
    print("=" * 90)
    print(f"  Total Real Images         : {total_images}")
    print(f"  Real Wildlife Captures    : {total_animals} (Tigers, Bear, Birds)")
    print(f"  Real Camera-Trap Blanks   : {total_blanks} (Swaying vegetation, storm, night IR, glare)")
    print(f"  Real Field Rangers/Humans : {total_humans}")
    print(f"  Triage Policy             : KEEP >= {keep_threshold:.0%}, REVIEW in [{quarantine_threshold:.0%}, {keep_threshold:.0%}), QUARANTINE < {quarantine_threshold:.0%}")
    print("=" * 90 + "\n")

    triage_policy = CameraTrapTriagePolicy(keep_threshold=keep_threshold, quarantine_threshold=quarantine_threshold)

    root_dir = Path(__file__).resolve().parent.parent.parent
    yolo_weights = root_dir / "models" / "yolov8n.pt"
    md_weights = root_dir / "models" / "MDV6-mit-yolov9-c.ckpt"

    detectors_to_test = [
        ("YOLOv8n (COCO-80 Baseline)", str(yolo_weights), "cpu"),
    ]

    import torch
    if md_weights.exists():
        if torch.backends.mps.is_available():
            detectors_to_test.append(("MegaDetector V6 (Zenodo MDV6 MPS)", str(md_weights), "mps"))
        detectors_to_test.append(("MegaDetector V6 (Zenodo MDV6 CPU)", str(md_weights), "cpu"))

    benchmark_results = {}

    for name, model_file, device in detectors_to_test:
        print(f"► Evaluating {name} on {device.upper()} …")
        try:
            detector = CameraTrapDetector(
                model_path=model_file,
                confidence_threshold=quarantine_threshold,  # Detect down to quarantine band
                device=device,
            )
        except Exception as e:
            print(f"  ⚠ Could not initialize {name}: {e}")
            continue

        # Warm-up
        _ = detector.detect_batch(image_paths[:2])

        # Benchmark Timing
        start_time = time.perf_counter()
        detections = detector.detect_batch(image_paths)
        elapsed_time = time.perf_counter() - start_time
        img_per_sec = total_images / max(1e-5, elapsed_time)

        # Apply Triage Policy
        tp_animal_kept = 0
        tp_animal_review = 0
        fn_animal_quarantined = 0  # CRITICAL FAILURE
        tp_blank_quarantined = 0
        fp_blank_kept = 0
        fp_blank_review = 0
        tp_person_handled = 0

        for gt, det in zip(gt_records, detections):
            cat = gt["true_category"]
            decision = triage_policy.evaluate(det)

            if cat == "animal":
                if decision.action == TriageAction.KEEP and det.has_animal:
                    tp_animal_kept += 1
                elif decision.action == TriageAction.REVIEW:
                    tp_animal_review += 1  # Safely preserved for human review!
                else:
                    fn_animal_quarantined += 1  # CRITICAL: Animal lost to blank quarantine

            elif cat == "blank":
                if decision.action == TriageAction.QUARANTINE:
                    tp_blank_quarantined += 1
                elif decision.action == TriageAction.REVIEW:
                    fp_blank_review += 1
                else:
                    fp_blank_kept += 1

            elif cat == "person":
                if det.has_human or decision.action in (TriageAction.KEEP, TriageAction.REVIEW):
                    tp_person_handled += 1

        # Safe animal preservation rate (Kept + Reviewed)
        animal_preservation_rate = (tp_animal_kept + tp_animal_review) / max(1, total_animals)
        animal_direct_recall = tp_animal_kept / max(1, total_animals)
        blank_quarantine_rate = tp_blank_quarantined / max(1, total_blanks)
        critical_fn_rate = fn_animal_quarantined / max(1, total_animals)

        res_dict = {
            "model_name": name,
            "device": device,
            "total_images": total_images,
            "elapsed_seconds": round(elapsed_time, 3),
            "throughput_img_per_sec": round(img_per_sec, 2),
            "animal_direct_recall_percent": round(animal_direct_recall * 100, 2),
            "animal_safe_preservation_percent": round(animal_preservation_rate * 100, 2),
            "critical_false_negatives": fn_animal_quarantined,
            "critical_false_negative_rate_percent": round(critical_fn_rate * 100, 2),
            "blank_quarantine_precision_percent": round(blank_quarantine_rate * 100, 2),
            "animals_kept": tp_animal_kept,
            "animals_sent_to_review": tp_animal_review,
            "blanks_quarantined": tp_blank_quarantined,
            "blanks_sent_to_review": fp_blank_review,
            "blanks_falsely_kept": fp_blank_kept,
        }
        benchmark_results[name] = res_dict

        print(f"  Throughput             : {res_dict['throughput_img_per_sec']} img/s ({res_dict['elapsed_seconds']}s total)")
        print(f"  Animal Safe Preservation: {res_dict['animal_safe_preservation_percent']}% ({tp_animal_kept + tp_animal_review}/{total_animals} animals saved)")
        print(f"    • Direct Auto-Kept   : {tp_animal_kept}/{total_animals} ({res_dict['animal_direct_recall_percent']}%)")
        print(f"    • Routed to Review   : {tp_animal_review}/{total_animals}")
        print(f"  Critical False Negatives: {res_dict['critical_false_negatives']} (Animal dropped as blank: {res_dict['critical_false_negative_rate_percent']}%)")
        print(f"  Blank Quarantine Rate  : {res_dict['blank_quarantine_precision_percent']}% ({tp_blank_quarantined}/{total_blanks} blanks safely filtered)")
        print("-" * 75 + "\n")

    # Save to JSON
    with open(Path(__file__).parent / "real_detector_benchmark_results.json", "w") as f:
        json.dump(benchmark_results, f, indent=2)

    return benchmark_results


if __name__ == "__main__":
    run_real_detector_benchmark()
