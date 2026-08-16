"""
setup_offline.py — One-time model download for fully offline operation.

Run this ONCE while connected to the internet:
    python3 setup_offline.py

After this, the entire triage pipeline works with no internet connection.
All models are cached in the weights/ folder.
"""

import os
import sys
from pathlib import Path

WEIGHTS_DIR = Path("weights")
WEIGHTS_DIR.mkdir(exist_ok=True)

REQUIRED_MODELS = {
    "weights/yolov8n.pt": {
        "source": "ultralytics",
        "model_id": "yolov8n.pt",
        "description": "Stage 1 — General subject detector (COCO 80 classes)",
        "size_mb": 6.2,
    },
    "weights/best_yolov8.pt": {
        "source": "local",
        "description": "Stage 2A — Tiger classifier (custom trained)",
    },
    "weights/best_enlightengan_and_yolov8.pt": {
        "source": "local",
        "description": "Stage 2B — Tiger classifier with dark-image enhancement",
    },
}


def check_and_download():
    print("\n" + "=" * 60)
    print("  Camera Trap Triage — Offline Setup")
    print("=" * 60 + "\n")

    all_ok = True

    for model_path, info in REQUIRED_MODELS.items():
        path = Path(model_path)
        desc = info["description"]

        if path.exists():
            size_mb = path.stat().st_size / (1024 * 1024)
            print(f"  ✅  {path.name:<45} ({size_mb:.1f} MB)  — {desc}")
        elif info["source"] == "ultralytics":
            print(f"  ⬇️   {path.name:<45} downloading …   — {desc}")
            try:
                from ultralytics import YOLO
                # Download by loading — ultralytics caches in ~/.ultralytics
                # then copy to our weights/ folder
                m = YOLO(info["model_id"])
                import shutil
                # Find the cached file
                cached = Path.home() / ".config" / "Ultralytics" / info["model_id"]
                if not cached.exists():
                    cached = Path(info["model_id"])  # sometimes written to cwd
                if cached.exists():
                    shutil.copy(str(cached), str(path))
                    print(f"         → saved to {path}")
                else:
                    # Already saved by ultralytics to cwd
                    cwd_path = Path(info["model_id"])
                    if cwd_path.exists():
                        shutil.copy(str(cwd_path), str(path))
                    else:
                        print(f"  ⚠️   Could not locate downloaded file. Check weights/")
                        all_ok = False
            except Exception as e:
                print(f"  ✗   Failed to download {path.name}: {e}")
                all_ok = False
        else:
            print(f"  ✗   {path.name:<45} MISSING — {desc}")
            print(f"      This model must be provided manually.")
            all_ok = False

    print()
    if all_ok:
        print("  All models ready. The pipeline will now run fully offline.")
        print("  Command: python3 triage.py --input <folder> --output <folder>")
    else:
        print("  Some models are missing. Resolve the errors above before going offline.")

    print("=" * 60 + "\n")
    return all_ok


if __name__ == "__main__":
    ok = check_and_download()
    sys.exit(0 if ok else 1)
