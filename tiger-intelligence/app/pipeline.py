"""
pipeline.py — Master Camera Trap Ingestion & Tiger Movement Intelligence Orchestrator
Pench Tiger Reserve — Forest Officer Automated Local Pipeline (100% Offline)
"""

import argparse
import json
import os
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np

# Internal module imports
from app.alerts.engine import AlertEngine
from app.database.db import TigerDatabase
from app.detection.detector import CameraTrapDetector
from app.ingestion.metadata import (PENCH_DEFAULT_STATIONS,
                                    analyze_sequence_health, extract_metadata)
from app.ingestion.scanner import scan_dataset
from app.ingestion.validator import validate_image_batch
from app.occupancy.mcp import calculate_tiger_home_range
from app.privacy.protector import apply_privacy_blur, quarantine_human_frame
from app.reid.extractor import DEFAULT_REID_MODEL, TigerStripeFeatureExtractor
from app.reid.flank_crop import generate_flank_candidates, crop_tiger_flank
from app.reid.matcher import TigerReIDMatcher
from app.species.classifier import SpeciesClassifier

VERSION = "3.1.0"


class TigerIntelligencePipeline:
    """End-to-End Offline Intelligence Pipeline for Pench Tiger Reserve."""

    def __init__(
        self,
        db_path: Optional[str] = None,
        detector_model: Optional[str] = None,
        species_model_a: Optional[str] = None,
        species_model_b: Optional[str] = None,
        reid_backbone: str = DEFAULT_REID_MODEL,
        batch_size: int = 16,
    ):
        proj_root = Path(__file__).resolve().parent.parent
        db_path = db_path or str(proj_root / "database" / "tiger.db")
        detector_model = detector_model or str(proj_root / "models" / "yolov8n.pt")
        species_model_a = species_model_a or str(proj_root / "models" / "best_yolov8.pt")
        species_model_b = species_model_b or str(proj_root / "models" / "best_enlightengan_and_yolov8.pt")

        print(f"Initializing Tiger Intelligence Pipeline v{VERSION}...")
        self.db = TigerDatabase(Path(db_path))
        self.batch_size = batch_size

        # Seed reference camera stations in database
        self._seed_default_stations()

        # Load models locally (100% offline)
        self.detector = CameraTrapDetector(model_path=detector_model, batch_size=batch_size)
        self.species_classifier = SpeciesClassifier(
            model_a_path=species_model_a,
            model_b_path=species_model_b,
            batch_size=batch_size,
        )
        self.reid_extractor = TigerStripeFeatureExtractor(model_name=reid_backbone)
        self.reid_matcher = TigerReIDMatcher()
        self.alert_engine = AlertEngine(self.db)
        print("✓ All offline models & engines initialized successfully.\n")

    def _seed_default_stations(self):
        """Seed known Pench camera trap grid stations."""
        for stn_id, data in PENCH_DEFAULT_STATIONS.items():
            self.db.upsert_station(
                station_id=stn_id,
                latitude=data["lat"],
                longitude=data["lon"],
                survey_id="Pench_2026_Cycle1",
                active_from="2026-01-01",
                zone=data.get("zone", "Core"),
                distance_to_village_km=data.get("village_km", 5.0),
                distance_to_buffer_km=data.get("buffer_km", 10.0),
            )

    def _ensure_station_exists(self, station_id: str, lat: float, lon: float):
        """Ensure station exists in database before recording detections."""
        if not self.db.get_station(station_id):
            self.db.upsert_station(
                station_id=station_id,
                latitude=lat,
                longitude=lon,
                survey_id="Pench_2026_Cycle1",
                active_from="2026-01-01",
                zone="Core",
            )

    def process_sd_card(
        self,
        raw_input_dir: str,
        output_base_dir: str = "tiger-intelligence/data",
        dry_run: bool = False,
    ) -> Dict:
        """
        Execute full multi-stage pipeline on raw SD card folder.
        """
        start_time = time.time()
        print("=" * 75)
        print(f"  PENCH TIGER RESERVE — AUTOMATED INTELLIGENCE PIPELINE v{VERSION}")
        print("=" * 75)
        print(f"  Source SD Card : {raw_input_dir}")
        print(f"  Database       : {self.db.db_path}")
        print(f"  Dry Run Mode   : {'YES' if dry_run else 'NO'}")
        print("=" * 75 + "\n")

        # ── Step 1: Recursive Ingestion & Folder Discovery ─────────────────────
        print("► Step 1/7: Discovering and normalizing files from SD Card …")
        discovered_files = scan_dataset(raw_input_dir)
        total_discovered = len(discovered_files)
        print(f"  Found {total_discovered} media files across folders.")

        if total_discovered == 0:
            print("  ⚠ No image files found to process.")
            return {"error": "no images found"}

        # ── Step 2: Parallel Pre-flight Corruption Validation ──────────────────
        print(f"\n► Step 2/7: Running parallel multi-layer integrity check …")
        all_paths = [r["original_path"] for r in discovered_files]
        validation_results = validate_image_batch(all_paths)

        valid_records = []
        corrupt_count = 0
        quarantine_corrupt_dir = Path(output_base_dir) / "quarantine" / "corrupt"
        quarantine_corrupt_dir.mkdir(parents=True, exist_ok=True)

        for rec in discovered_files:
            orig_p = rec["original_path"]
            is_valid, reason = validation_results.get(orig_p, (True, "ok"))
            stn = rec["inferred_camera_id"]

            if not is_valid:
                corrupt_count += 1
                rec["is_corrupt"] = True
                rec["status"] = "corrupt_quarantined"
                rec["quality_flags"] = [f"corrupt: {reason}"]
                if not dry_run:
                    dest = quarantine_corrupt_dir / Path(orig_p).name
                    shutil.copy2(orig_p, str(dest))

                self._ensure_station_exists(stn, 21.7200, 79.3250)
                self.db.record_image(
                    image_id=rec["image_id"],
                    original_path=orig_p,
                    file_name=rec["file_name"],
                    file_size_bytes=rec["file_size_bytes"],
                    source_folder=rec["source_folder"],
                    station_id=stn,
                    is_corrupt=True,
                    status="corrupt_quarantined",
                    quality_flags=[reason],
                )
                print(f"  [CORRUPT] {rec['file_name']} -> Quarantined ({reason})")
            else:
                rec["is_corrupt"] = False
                valid_records.append(rec)

        print(f"  Valid images: {len(valid_records)} | Corrupt: {corrupt_count}")

        # ── Step 3: Metadata Extraction & Initial Ingestion ────────────────────
        print(f"\n► Step 3/7: Parsing camera metadata & sequence health …")
        for rec in valid_records:
            meta = extract_metadata(rec["file_path"], rec["inferred_camera_id"])
            rec.update(meta)
            stn = rec["inferred_camera_id"]
            self._ensure_station_exists(stn, rec["latitude"], rec["longitude"])

            # Ingest record into database
            self.db.record_image(
                image_id=rec["image_id"],
                original_path=rec["original_path"],
                file_name=rec["file_name"],
                file_size_bytes=rec["file_size_bytes"],
                source_folder=rec["source_folder"],
                station_id=stn,
                timestamp=rec["timestamp"],
                latitude=rec["latitude"],
                longitude=rec["longitude"],
                is_corrupt=False,
                status="ingested",
                quality_flags=rec.get("quality_flags", []),
            )

        valid_records = analyze_sequence_health(valid_records)

        # ── Step 4: Subject Detection (Animals, Humans, Blanks) ────────────────
        print(f"\n► Step 4/7: Detecting subjects (MegaDetector Camera Trap Standard) …")
        valid_paths = [r["original_path"] for r in valid_records]
        det_results = self.detector.detect_batch(valid_paths)

        animal_candidates = []
        human_candidates = []
        blank_candidates = []

        quarantine_blank_dir = Path(output_base_dir) / "quarantine" / "blanks"
        quarantine_blank_dir.mkdir(parents=True, exist_ok=True)

        for rec, det in zip(valid_records, det_results):
            rec["det_result"] = det
            if det.has_human:
                human_candidates.append((rec, det))
            elif det.has_animal:
                animal_candidates.append((rec, det))
            else:
                blank_candidates.append((rec, det))
                if not dry_run:
                    dest = quarantine_blank_dir / Path(rec["original_path"]).name
                    shutil.copy2(rec["original_path"], str(dest))
                self.db.record_image(
                    image_id=rec["image_id"],
                    original_path=rec["original_path"],
                    file_name=rec["file_name"],
                    file_size_bytes=rec["file_size_bytes"],
                    source_folder=rec["source_folder"],
                    station_id=rec["inferred_camera_id"],
                    timestamp=rec["timestamp"],
                    latitude=rec["latitude"],
                    longitude=rec["longitude"],
                    status="blank_quarantined",
                    quality_flags=rec.get("quality_flags", []),
                )

        print(f"  Subject Breakdown: Animal={len(animal_candidates)}, Human={len(human_candidates)}, Blank={len(blank_candidates)}")

        # ── Step 5: Privacy Protection for Humans ──────────────────────────────
        print(f"\n► Step 5/7: Applying human privacy safeguards …")
        for rec, det in human_candidates:
            h_boxes = [b.bbox_xyxy for b in det.boxes if b.is_human]
            blurred_path = apply_privacy_blur(rec["original_path"], h_boxes)
            if not dry_run:
                isolated_path = quarantine_human_frame(rec["original_path"])
            else:
                isolated_path = rec["original_path"]

            self.db.record_image(
                image_id=rec["image_id"],
                original_path=isolated_path,
                file_name=rec["file_name"],
                file_size_bytes=rec["file_size_bytes"],
                source_folder=rec["source_folder"],
                station_id=rec["inferred_camera_id"],
                timestamp=rec["timestamp"],
                latitude=rec["latitude"],
                longitude=rec["longitude"],
                status="human_review_restricted",
                quality_flags=["human_detected_privacy_blurred"],
            )

        # ── Step 6: Species Classification & Tiger Localization ────────────────
        print(f"\n► Step 6/7: Classifying species & localizing tigers …")
        animal_paths = [r["original_path"] for r, _ in animal_candidates]
        species_results = self.species_classifier.classify_candidates(animal_paths)

        tiger_records = []
        non_target_records = []

        for (rec, det), sp in zip(animal_candidates, species_results):
            rec["species_result"] = sp
            if sp.is_tiger and sp.bbox_xyxy is not None:
                tiger_records.append((rec, sp))
            else:
                non_target_records.append((rec, sp))
                self.db.record_image(
                    image_id=rec["image_id"],
                    original_path=rec["original_path"],
                    file_name=rec["file_name"],
                    file_size_bytes=rec["file_size_bytes"],
                    source_folder=rec["source_folder"],
                    station_id=rec["inferred_camera_id"],
                    timestamp=rec["timestamp"],
                    latitude=rec["latitude"],
                    longitude=rec["longitude"],
                    status="non_target_retained",
                    quality_flags=rec.get("quality_flags", []),
                )

        print(f"  Confirmed Tigers: {len(tiger_records)} | Non-Target Wildlife: {len(non_target_records)}")

        # ── Step 7: Individual Tiger Re-ID, Flank Matching & Alert Engine ──────
        print(f"\n► Step 7/7: Extracting flank stripe patterns & matching tiger identities (MegaDescriptor) …")
        reid_matches = []
        all_generated_alerts = []

        for rec, sp in tiger_records:
            # 1. Deterministic Dual Flank / Body Candidate Extraction
            candidates = generate_flank_candidates(
                image_path=rec["original_path"],
                bbox_xyxy=sp.bbox_xyxy,
                output_crop_dir=f"{output_base_dir}/processed/crops"
            )

            # 2. Extract wildlife embeddings for each candidate crop
            candidate_embeddings = [
                (c.crop_type, self.reid_extractor.extract_embedding(c.crop_array))
                for c in candidates
            ]

            # Primary crop for UI / detection record
            primary_crop = candidates[0] if candidates else None
            primary_crop_path = primary_crop.crop_path if primary_crop else None

            # 3. Match against multi-reference individual gallery
            reference_gallery = self.db.get_tiger_reference_gallery()
            match_res = self.reid_matcher.match_candidates(
                query_candidate_embeddings=candidate_embeddings,
                reference_gallery=reference_gallery,
            )

            # 4. Assign or Register Tiger ID
            if match_res.is_new_individual:
                new_idx = len(self.db.get_all_tigers()) + 1
                assigned_tiger_id = f"T-PENCH-{new_idx:03d}"
                self.db.register_tiger(
                    tiger_id=assigned_tiger_id,
                    name=f"Pench Tiger {assigned_tiger_id}",
                    reference_image_path=rec["original_path"],
                    embedding=candidate_embeddings[0][1] if candidate_embeddings else None,
                    flank_side="both",
                    notes="Auto-discovered individual from field camera traps",
                )
                # Store all candidate embeddings in gallery
                for c_type, emb in candidate_embeddings:
                    self.db.add_reference_embedding(
                        tiger_id=assigned_tiger_id,
                        embedding=emb,
                        crop_type=c_type,
                        source_crop_path=primary_crop_path,
                        encounter_image_id=rec["image_id"],
                    )
                print(f"  ✦ [NEW INDIVIDUAL DISCOVERED] Assigned ID: {assigned_tiger_id}")
            else:
                assigned_tiger_id = match_res.matched_tiger_id
                # Enrich reference gallery with high-confidence sightings
                if match_res.confidence_level == "HIGH" and candidate_embeddings:
                    self.db.add_reference_embedding(
                        tiger_id=assigned_tiger_id,
                        embedding=candidate_embeddings[0][1],
                        crop_type=match_res.selected_crop_type,
                        source_crop_path=primary_crop_path,
                        encounter_image_id=rec["image_id"],
                    )
                print(f"  ★ [TIGER MATCHED] File: {rec['file_name']} -> {assigned_tiger_id} ({match_res.confidence_level}, Sim={match_res.similarity_score:.1%})")

            # Update image status to tiger confirmed
            self.db.record_image(
                image_id=rec["image_id"],
                original_path=rec["original_path"],
                file_name=rec["file_name"],
                file_size_bytes=rec["file_size_bytes"],
                source_folder=rec["source_folder"],
                station_id=rec["inferred_camera_id"],
                timestamp=rec["timestamp"],
                latitude=rec["latitude"],
                longitude=rec["longitude"],
                status="tiger_confirmed",
                quality_flags=rec.get("quality_flags", []),
            )

            det_id = f"DET_{rec['image_id']}"
            self.db.record_detection(
                detection_id=det_id,
                image_id=rec["image_id"],
                station_id=rec["inferred_camera_id"],
                timestamp=rec["timestamp"],
                is_animal=True,
                is_human=False,
                is_vehicle=False,
                is_blank=False,
                detected_species="tiger",
                species_confidence=sp.tiger_confidence,
                bbox=sp.bbox_xyxy,
                crop_path=primary_crop_path,
                flank_orientation=match_res.selected_crop_type,
                reid_matched_tiger_id=assigned_tiger_id,
                reid_similarity=match_res.similarity_score,
                reid_confidence_level=match_res.confidence_level,
                reid_evidence_breakdown=match_res.evidence_breakdown,
            )

            # Record trajectory
            self.db.record_movement(
                tiger_id=assigned_tiger_id,
                detection_id=det_id,
                station_id=rec["inferred_camera_id"],
                timestamp=rec["timestamp"],
                latitude=rec["latitude"],
                longitude=rec["longitude"],
            )

            # Run Explainable Alerts Engine
            alerts = self.alert_engine.evaluate_new_sighting(
                tiger_id=assigned_tiger_id,
                current_station_id=rec["inferred_camera_id"],
                current_timestamp=rec["timestamp"],
                current_lat=rec["latitude"],
                current_lon=rec["longitude"],
                reid_similarity=match_res.similarity_score,
            )
            all_generated_alerts.extend(alerts)

            reid_matches.append({
                "file_name": rec["file_name"],
                "tiger_id": assigned_tiger_id,
                "confidence_level": match_res.confidence_level,
                "similarity": match_res.similarity_score,
                "station_id": rec["inferred_camera_id"],
            })

        # Update tiger occupancy statistics (MCP)
        for t in self.db.get_all_tigers():
            tid = t["tiger_id"]
            history = self.db.get_tiger_movement_history(tid)
            if history:
                occ = calculate_tiger_home_range(history)
                last_seen = history[-1]["timestamp"]
                self.db.update_tiger_occupancy(
                    tiger_id=tid,
                    centroid_lat=occ["centroid_lat"] or 0.0,
                    centroid_lon=occ["centroid_lon"] or 0.0,
                    home_range_area_km2=occ["home_range_km2"],
                    last_seen=last_seen,
                )

        elapsed = time.time() - start_time
        summary = {
            "version": VERSION,
            "runtime_seconds": round(elapsed, 2),
            "total_images_scanned": total_discovered,
            "corrupt_quarantined": corrupt_count,
            "blanks_quarantined": len(blank_candidates),
            "humans_protected": len(human_candidates),
            "non_target_wildlife": len(non_target_records),
            "tigers_identified": len(tiger_records),
            "unique_individuals": len(self.db.get_all_tigers()),
            "alerts_generated": len(all_generated_alerts),
            "alerts": all_generated_alerts,
        }

        self._print_final_summary(summary)
        return summary

    def _print_final_summary(self, summary: dict):
        print("\n" + "=" * 75)
        print("  INGESTION & INTELLIGENCE RUN COMPLETE")
        print("=" * 75)
        print(f"  Total Images Ingested     : {summary['total_images_scanned']}")
        print(f"  Corrupt Quarantined       : {summary['corrupt_quarantined']}")
        print(f"  Blank Frames Quarantined  : {summary['blanks_quarantined']}")
        print(f"  Humans Protected (Masked) : {summary['humans_protected']}")
        print(f"  Non-Target Wildlife Saved : {summary['non_target_wildlife']}")
        print(f"  Individual Tigers Sighted : {summary['tigers_identified']}")
        print(f"  Total Tiger Profiles      : {summary['unique_individuals']}")
        print(f"  Actionable Alerts Raised  : {summary['alerts_generated']}")
        print(f"  Total Runtime             : {summary['runtime_seconds']}s")
        print("=" * 75)
        if summary["alerts"]:
            print("\n🚨 CRITICAL & ACTIONABLE ALERTS:")
            for a in summary["alerts"]:
                print(f"  [{a['severity']}] {a['title']}")
                print(f"    ↳ {a['explanation']}")
        print("=" * 75 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Pench Tiger Reserve Movement Intelligence Pipeline")
    parser.add_argument("--input", "-i", default="tiger-intelligence/data/raw", help="Path to raw camera trap SD card folder")
    parser.add_argument("--db", "-d", default="tiger-intelligence/database/tiger.db", help="Path to SQLite database")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without copying files")

    args = parser.parse_args()
    pipeline = TigerIntelligencePipeline(db_path=args.db)
    pipeline.process_sd_card(raw_input_dir=args.input, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
