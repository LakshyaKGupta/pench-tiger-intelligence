"""
evaluate_detector.py — Scientific Benchmark: YOLOv8n vs MegaDetector V6
Pench Tiger Reserve Camera Trap Intelligence System

Evaluates:
  1. Animal Recall (Critical: Never miss an animal in camera trap)
  2. Blank Precision (Suppress true empty frames safely)
  3. False Negatives (Animal dropped as blank)
  4. False Positives (Blank classified as animal)
  5. Person & Vehicle Detection Precision
  6. Inference Throughput (img/s) on CPU and Apple Silicon MPS
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

from app.config import TRIAGE_KEEP_THRESHOLD
from app.detection.detector import CameraTrapDetector


def run_detector_benchmark(
    benchmark_dir: Optional[str] = None,
    conf_threshold: float = TRIAGE_KEEP_THRESHOLD,
    batch_size: int = 16,
) -> Dict:
    """
    Run empirical side-by-side benchmark of subject detectors on labelled camera trap data.
    """
    bench_path = Path(benchmark_dir) if benchmark_dir else Path(__file__).parent
    gt_file = bench_path / "ground_truth.json"
    
    if not gt_file.exists():
        raise FileNotFoundError(f"Benchmark ground truth not found at {gt_file}")

    with open(gt_file, "r") as f:
        gt_records = json.load(f)

    image_paths = [r["path"] for r in gt_records]
    total_images = len(image_paths)

    print("\n" + "=" * 82)
    print("  CAMERA-TRAP SUBJECT DETECTOR BENCHMARK")
    print("=" * 82)
    print(f"  Total Labelled Images     : {total_images}")
    print(f"  Animal Frames             : {sum(1 for r in gt_records if r['true_category'] == 'animal')}")
    print(f"  Blank / Foliage Frames    : {sum(1 for r in gt_records if r['true_category'] == 'blank')}")
    print(f"  Human / Patrol Frames     : {sum(1 for r in gt_records if r['true_category'] == 'person')}")
    print(f"  Vehicle Frames            : {sum(1 for r in gt_records if r['true_category'] == 'vehicle')}")
    print(f"  Confidence Threshold      : {conf_threshold:.0%}")
    print("=" * 82 + "\n")

    # Available detectors to test
    detectors_to_test = [
        ("YOLOv8n (COCO-80 Baseline)", "tiger-intelligence/models/yolov8n.pt", "cpu"),
    ]

    # Add MPS variant if available
    import torch
    if torch.backends.mps.is_available():
        detectors_to_test.append(("YOLOv8n (MPS Metal Backend)", "tiger-intelligence/models/yolov8n.pt", "mps"))

    # Add MegaDetector V6 if weights are available
    md_weights = Path("tiger-intelligence/models/MDV6-mit-yolov9-c.ckpt")
    if md_weights.exists():
        detectors_to_test.append(("MegaDetector V6 (Zenodo MDV6 CPU)", str(md_weights), "cpu"))
        if torch.backends.mps.is_available():
            detectors_to_test.append(("MegaDetector V6 (Zenodo MDV6 MPS)", str(md_weights), "mps"))

    benchmark_results = {}

    for name, model_file, device in detectors_to_test:
        print(f"► Evaluating {name} on {device.upper()} …")
        try:
            detector = CameraTrapDetector(
                model_path=model_file,
                confidence_threshold=conf_threshold,
                batch_size=batch_size,
                device=device,
            )
        except Exception as e:
            print(f"  ⚠ Could not initialize {name}: {e}")
            continue

        # Warm-up
        _ = detector.detect_batch(image_paths[:2])

        # Benchmark Timing
        start_time = time.perf_counter()
        results = detector.detect_batch(image_paths)
        elapsed_time = time.perf_counter() - start_time
        img_per_sec = total_images / max(1e-5, elapsed_time)

        # Compute Metrics
        tp_animal = 0
        fn_animal = 0  # Animal frame predicted as blank
        fp_animal = 0  # Blank predicted as animal
        tp_blank = 0
        fp_blank = 0
        tp_person = 0
        tp_vehicle = 0

        for gt, res in zip(gt_records, results):
            cat = gt["true_category"]
            
            if cat == "animal":
                if res.has_animal:
                    tp_animal += 1
                elif res.is_blank:
                    fn_animal += 1  # CRITICAL FAILURE
                else:
                    # Mislabeled as person/vehicle
                    fn_animal += 1

            elif cat == "blank":
                if res.is_blank:
                    tp_blank += 1
                else:
                    fp_animal += 1
                    fp_blank += 1

            elif cat == "person":
                if res.has_human:
                    tp_person += 1

            elif cat == "vehicle":
                if res.has_vehicle:
                    tp_vehicle += 1

        total_animals = sum(1 for r in gt_records if r["true_category"] == "animal")
        total_blanks = sum(1 for r in gt_records if r["true_category"] == "blank")
        total_humans = sum(1 for r in gt_records if r["true_category"] == "person")
        total_vehicles = sum(1 for r in gt_records if r["true_category"] == "vehicle")

        animal_recall = (tp_animal / total_animals) if total_animals > 0 else 1.0
        blank_precision = (tp_blank / (tp_blank + fp_blank)) if (tp_blank + fp_blank) > 0 else 1.0
        blank_recall = (tp_blank / total_blanks) if total_blanks > 0 else 1.0
        human_recall = (tp_person / total_humans) if total_humans > 0 else 1.0
        vehicle_recall = (tp_vehicle / total_vehicles) if total_vehicles > 0 else 1.0

        res_dict = {
            "model_name": name,
            "device": device,
            "total_images": total_images,
            "elapsed_seconds": round(elapsed_time, 3),
            "throughput_img_per_sec": round(img_per_sec, 2),
            "animal_recall_percent": round(animal_recall * 100, 2),
            "blank_precision_percent": round(blank_precision * 100, 2),
            "blank_recall_percent": round(blank_recall * 100, 2),
            "critical_false_negatives": fn_animal,
            "false_positive_blanks": fp_blank,
            "human_recall_percent": round(human_recall * 100, 2),
            "vehicle_recall_percent": round(vehicle_recall * 100, 2),
        }
        benchmark_results[name] = res_dict

        print(f"  Throughput             : {res_dict['throughput_img_per_sec']} img/s ({res_dict['elapsed_seconds']}s total)")
        print(f"  Animal Recall          : {res_dict['animal_recall_percent']}% ({tp_animal}/{total_animals})")
        print(f"  Blank Precision        : {res_dict['blank_precision_percent']}%")
        print(f"  Critical False Negatives: {res_dict['critical_false_negatives']} (Animal dropped as blank)")
        print(f"  Human Privacy Recall   : {res_dict['human_recall_percent']}%")
        print("-" * 70 + "\n")

    # Save to JSON
    with open(bench_path / "detector_benchmark_results.json", "w") as f:
        json.dump(benchmark_results, f, indent=2)

    return benchmark_results


if __name__ == "__main__":
    run_detector_benchmark()
