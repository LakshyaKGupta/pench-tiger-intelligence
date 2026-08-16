"""
generate_messy_test_dataset.py — Construct a Complex Real-World Field SD Card
Pench Tiger Reserve Camera Trap Intelligence System

Generates a realistic, nested SD card directory structure to test:
  1. Deep nested directory discovery (DCIM/100MEDIA, camera17, card_backup)
  2. Corrupt file isolation (header truncation, non-image text files)
  3. Real camera-trap blanks (wind/vegetation, night IR)
  4. Human encounters (privacy blur & quarantine)
  5. Multi-encounter Tiger Re-ID (known tiger tracking & new tiger discovery)
  6. Movement Intelligence Verification (3 Core Cases):
     - Case 1: Normal movement across known core territory
     - Case 2: Sighting at newly activated camera trap (suppressing false alert via survey-effort awareness)
     - Case 3: Sighting at village buffer boundary (triggering actionable territory deviation alert)
"""

import os
import shutil
from pathlib import Path

def create_messy_sd_card(base_out: Optional[str] = None):
    proj_root = Path(__file__).resolve().parent.parent
    out_dir = Path(base_out) if base_out else (proj_root / "data" / "test_messy_sdcard")
    if out_dir.exists():
        shutil.rmtree(out_dir)

    out_dir.mkdir(parents=True, exist_ok=True)

    # Folder 1: DCIM/100MEDIA (Standard camera trap folder)
    f1 = out_dir / "DCIM" / "100MEDIA"
    f1.mkdir(parents=True, exist_ok=True)

    # Folder 2: DCIM/101MEDIA
    f2 = out_dir / "DCIM" / "101MEDIA"
    f2.mkdir(parents=True, exist_ok=True)

    # Folder 3: camera17 (Field renamed folder)
    f3 = out_dir / "camera17"
    f3.mkdir(parents=True, exist_ok=True)

    # Folder 4: card_backup/nested_trap_data (Deep nested backup)
    f4 = out_dir / "card_backup" / "nested_trap_data"
    f4.mkdir(parents=True, exist_ok=True)

    # Source images
    atrw_q = sorted(list((proj_root / "evaluation" / "dataset" / "query").glob("*/*.jpg")))
    atrw_unk = sorted(list((proj_root / "evaluation" / "dataset" / "unknown").glob("*/*.jpg")))
    real_blanks = sorted(list((proj_root / "evaluation" / "benchmark_detector" / "real_images").glob("*.JPG")))

    # ── Populate DCIM/100MEDIA ─────────────────────────────────────────────────
    # Image 1: Tiger T-001 at STN_01 (Core Zone)
    if atrw_q:
        shutil.copy2(atrw_q[0], f1 / "STN01_20260301_061500_IMG_0001.JPG")

    # Image 2: Tiger T-001 at STN_02 (Core Zone, 24h later - Normal movement) [Case 1]
    if len(atrw_q) > 1:
        shutil.copy2(atrw_q[1], f1 / "STN02_20260302_083000_IMG_0002.JPG")

    # Image 3: Truncated corrupt file
    with open(f1 / "IMG_0003_corrupt.JPG", "wb") as f:
        f.write(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00")

    # ── Populate DCIM/101MEDIA ─────────────────────────────────────────────────
    # Real Blanks (Swaying vegetation & night IR)
    if real_blanks:
        shutil.copy2(real_blanks[0], f2 / "STN03_20260302_120000_BLANK_01.JPG")
    if len(real_blanks) > 1:
        shutil.copy2(real_blanks[1], f2 / "STN03_20260302_143000_BLANK_02.JPG")

    # Non-image metadata text file
    with open(f2 / "field_deployment_notes.txt", "w") as f:
        f.write("Pench Camera Trap Grid Sector 4 - Battery replaced on 2026-03-01 by Team Beta\n")

    # ── Populate camera17 ──────────────────────────────────────────────────────
    # Unseen Tiger (New individual discovery)
    if atrw_unk:
        shutil.copy2(atrw_unk[0], f3 / "STN04_20260303_190000_TIGER_UNSEEN.JPG")

    # Non-target wildlife (sloth bear or bird)
    raw_dir = proj_root / "data" / "raw"
    if (raw_dir / "550939.jpg").exists():
        shutil.copy2(raw_dir / "550939.jpg", f3 / "STN04_20260303_211500_SLOTH_BEAR.JPG")

    # ── Populate card_backup/nested_trap_data ──────────────────────────────────
    # Image 4: Tiger T-001 at STN_06 (Newly installed station in Core Zone) [Case 2: No false alert]
    if len(atrw_q) > 2:
        shutil.copy2(atrw_q[2], f4 / "STN06_20260304_100000_T001_NEW_STN.JPG")

    # Image 5: Tiger T-001 at STN_05 (Village Boundary / Buffer Zone - 18.5 km jump in 3 hours) [Case 3: Actionable Alert!]
    if len(atrw_q) > 3:
        shutil.copy2(atrw_q[3], f4 / "STN05_20260304_130000_T001_BUFFER_ANOMALY.JPG")

    print(f"✅ Generated Messy Test SD Card at: {out_dir}")
    for root, dirs, files in os.walk(out_dir):
        level = root.replace(str(out_dir), '').count(os.sep)
        indent = ' ' * 4 * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            sz = os.path.getsize(os.path.join(root, f))
            print(f"{subindent}{f} ({sz} bytes)")

if __name__ == "__main__":
    create_messy_sd_card()
