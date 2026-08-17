"""
pipeline.py — Master Camera Trap Ingestion & Tiger Movement Intelligence Orchestrator
Pench Tiger Reserve — Forest Officer Automated Local Pipeline (100% Offline)
"""

import os
# Enforce strict offline operation for all models
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

import argparse
import csv
import hashlib
import json
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np

# Internal module imports
from app.alerts.engine import AlertEngine
from app.config import TRIAGE_KEEP_THRESHOLD, TRIAGE_QUARANTINE_THRESHOLD
from app.database.db import TigerDatabase
from app.detection.detector import CameraTrapDetector
from app.detection.triage import CameraTrapTriagePolicy, TriageAction
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

VERSION = "3.2.0"


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
        keep_threshold: float = TRIAGE_KEEP_THRESHOLD,
        quarantine_threshold: float = TRIAGE_QUARANTINE_THRESHOLD,
    ):
        proj_root = Path(__file__).resolve().parent.parent
        db_path = db_path or str(proj_root / "database" / "tiger.db")
        detector_model = detector_model or str(proj_root / "models" / "yolov8n.pt")
        species_model_a = species_model_a or str(proj_root / "models" / "best_yolov8.pt")
        species_model_b = species_model_b or str(proj_root / "models" / "best_enlightengan_and_yolov8.pt")

        print(f"Initializing Tiger Intelligence Pipeline v{VERSION}...")
        self.db = TigerDatabase(Path(db_path))
        self.batch_size = batch_size
        self.triage_policy = CameraTrapTriagePolicy(keep_threshold=keep_threshold, quarantine_threshold=quarantine_threshold)

        # Seed reference camera stations in database
        self._seed_default_stations()

        # Load models locally (100% offline)
        self.detector = CameraTrapDetector(model_path=detector_model, batch_size=batch_size, confidence_threshold=quarantine_threshold)
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

    @staticmethod
    def _compute_sha256(file_path: str) -> str:
        """Calculate cryptographic SHA-256 hash of a file for audit provenance."""
        try:
            h = hashlib.sha256()
            with open(file_path, "rb") as f:
                while chunk := f.read(65536):
                    h.update(chunk)
            return h.hexdigest()
        except Exception:
            return "unknown_hash"

    def process_sd_card(
        self,
        raw_input_dir: str,
        output_base_dir: str = "tiger-intelligence/data",
        dry_run: bool = False,
    ) -> Dict:
        """
        Execute full multi-stage pipeline on raw SD card folder and export all 6 deliverables:
          1. results.json
          2. detections.csv
          3. quarantine_manifest.csv
          4. occupancy.geojson
          5. alerts.json
          6. audit.log
        """
        start_time = time.time()
        audit_log: List[Dict] = []
        out_dir = Path(output_base_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        def log_audit(event_type: str, details: Dict):
            entry = {
                "timestamp": datetime.now().isoformat(),
                "event": event_type,
                **details,
            }
            audit_log.append(entry)

        print("=" * 80)
        print(f"  PENCH TIGER RESERVE — AUTOMATED INTELLIGENCE PIPELINE v{VERSION}")
        print("=" * 80)
        print(f"  Source SD Card : {raw_input_dir}")
        print(f"  Database       : {self.db.db_path}")
        print(f"  Deliverables   : {out_dir}")
        print(f"  Dry Run Mode   : {'YES' if dry_run else 'NO'}")
        print("=" * 80 + "\n")

        log_audit("PIPELINE_START", {
            "version": VERSION,
            "raw_input_dir": str(raw_input_dir),
            "dry_run": dry_run,
        })

        # ── Step 1: Recursive Ingestion & Folder Discovery ─────────────────────
        print("► Step 1/7: Discovering and normalizing files from SD Card …")
        discovered_files = scan_dataset(raw_input_dir)
        total_discovered = len(discovered_files)
        print(f"  Found {total_discovered} media files across folders.")

        log_audit("DISCOVERY_COMPLETE", {
            "total_files_discovered": total_discovered,
        })

        if total_discovered == 0:
            print("  ⚠ No image files found to process.")
            return {"error": "no images found"}

        # ── Step 2: Parallel Pre-flight Corruption Validation ──────────────────
        print(f"\n► Step 2/7: Running parallel multi-layer integrity check …")
        all_paths = [r["original_path"] for r in discovered_files]
        validation_results = validate_image_batch(all_paths)

        valid_records = []
        quarantine_manifest_rows = []
        corrupt_count = 0
        quarantine_corrupt_dir = out_dir / "quarantine" / "corrupt"
        quarantine_corrupt_dir.mkdir(parents=True, exist_ok=True)

        for rec in discovered_files:
            orig_p = rec["original_path"]
            is_valid, reason = validation_results.get(orig_p, (True, "ok"))
            stn = rec["inferred_camera_id"]
            sha256 = self._compute_sha256(orig_p)
            rec["sha256"] = sha256

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
                quarantine_manifest_rows.append({
                    "file_name": rec["file_name"],
                    "original_path": orig_p,
                    "station_id": stn,
                    "category": "corrupt",
                    "reason": f"Integrity check failure: {reason}",
                    "sha256_hash": sha256,
                    "timestamp": rec.get("timestamp", datetime.now().isoformat()),
                    "is_reversible": True,
                })
                log_audit("FILE_CORRUPT_QUARANTINED", {
                    "file_name": rec["file_name"],
                    "reason": reason,
                    "sha256": sha256,
                })
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

        # ── Step 4: Subject Detection & Evidence-Preserving Triage ─────────────
        print(f"\n► Step 4/7: Detecting subjects & executing evidence-preserving triage …")
        valid_paths = [r["original_path"] for r in valid_records]
        det_results = self.detector.detect_batch(valid_paths)

        animal_candidates = []
        human_candidates = []
        review_candidates = []
        blank_candidates = []

        quarantine_blank_dir = out_dir / "quarantine" / "blanks"
        quarantine_blank_dir.mkdir(parents=True, exist_ok=True)
        review_dir = out_dir / "review"
        review_dir.mkdir(parents=True, exist_ok=True)

        for rec, det in zip(valid_records, det_results):
            rec["det_result"] = det
            triage_dec = self.triage_policy.evaluate(det)
            rec["triage_decision"] = triage_dec

            if triage_dec.action == TriageAction.KEEP:
                if det.has_human:
                    human_candidates.append((rec, det))
                elif det.has_animal:
                    animal_candidates.append((rec, det))
                else:
                    animal_candidates.append((rec, det))
            elif triage_dec.action == TriageAction.REVIEW:
                review_candidates.append((rec, det))
                if not dry_run:
                    dest = review_dir / Path(rec["original_path"]).name
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
                    status="review_flagged",
                    quality_flags=rec.get("quality_flags", []) + ["triage_review_required"],
                )
                quarantine_manifest_rows.append({
                    "file_name": rec["file_name"],
                    "original_path": rec["original_path"],
                    "station_id": rec["inferred_camera_id"],
                    "category": "review_flagged",
                    "reason": triage_dec.reason,
                    "sha256_hash": rec["sha256"],
                    "timestamp": rec.get("timestamp", datetime.now().isoformat()),
                    "is_reversible": True,
                })
                log_audit("FILE_FLAGGED_FOR_REVIEW", {
                    "file_name": rec["file_name"],
                    "reason": triage_dec.reason,
                    "confidence": triage_dec.top_confidence,
                })
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
                quarantine_manifest_rows.append({
                    "file_name": rec["file_name"],
                    "original_path": rec["original_path"],
                    "station_id": rec["inferred_camera_id"],
                    "category": "blank_quarantine",
                    "reason": triage_dec.reason,
                    "sha256_hash": rec["sha256"],
                    "timestamp": rec.get("timestamp", datetime.now().isoformat()),
                    "is_reversible": True,
                })

        print(f"  Triage Breakdown: Animal={len(animal_candidates)}, Human={len(human_candidates)}, Review={len(review_candidates)}, Blank={len(blank_candidates)}")

        # ── Step 5: Privacy Protection for Humans ──────────────────────────────
        print(f"\n► Step 5/7: Applying human privacy safeguards …")
        detections_csv_rows = []

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
            det_id = f"DET_HUMAN_{rec['image_id']}"
            detections_csv_rows.append({
                "detection_id": det_id,
                "image_id": rec["image_id"],
                "file_name": rec["file_name"],
                "station_id": rec["inferred_camera_id"],
                "timestamp": rec["timestamp"],
                "latitude": rec["latitude"],
                "longitude": rec["longitude"],
                "category": "person",
                "species": "human",
                "species_confidence": det.top_confidence,
                "reid_matched_tiger_id": "N/A",
                "reid_similarity": 0.0,
                "reid_confidence_level": "N/A",
                "bbox_xyxy": str(h_boxes[0]) if h_boxes else "[]",
                "status": "privacy_blurred",
            })

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
                det_id = f"DET_WILDLIFE_{rec['image_id']}"
                detections_csv_rows.append({
                    "detection_id": det_id,
                    "image_id": rec["image_id"],
                    "file_name": rec["file_name"],
                    "station_id": rec["inferred_camera_id"],
                    "timestamp": rec["timestamp"],
                    "latitude": rec["latitude"],
                    "longitude": rec["longitude"],
                    "category": "animal",
                    "species": sp.species_name,
                    "species_confidence": sp.species_confidence,
                    "reid_matched_tiger_id": "N/A",
                    "reid_similarity": 0.0,
                    "reid_confidence_level": "N/A",
                    "bbox_xyxy": str(sp.bbox_xyxy) if sp.bbox_xyxy else "[]",
                    "status": "non_target_retained",
                })

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
                    notes=f"Auto-registered from SD Ingestion. Best similarity to known catalogue was {match_res.similarity_score:.1%}.",
                )
                if candidate_embeddings:
                    self.db.add_reference_embedding(
                        tiger_id=assigned_tiger_id,
                        embedding=candidate_embeddings[0][1],
                        crop_type=match_res.selected_crop_type,
                        source_crop_path=primary_crop_path,
                        encounter_image_id=rec["image_id"],
                    )
                log_audit("TIGER_NEW_INDIVIDUAL_REGISTERED", {
                    "tiger_id": assigned_tiger_id,
                    "file_name": rec["file_name"],
                    "similarity": match_res.similarity_score,
                })
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
                log_audit("TIGER_REID_MATCHED", {
                    "tiger_id": assigned_tiger_id,
                    "file_name": rec["file_name"],
                    "confidence": match_res.confidence_level,
                    "similarity": match_res.similarity_score,
                })
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

            detections_csv_rows.append({
                "detection_id": det_id,
                "image_id": rec["image_id"],
                "file_name": rec["file_name"],
                "station_id": rec["inferred_camera_id"],
                "timestamp": rec["timestamp"],
                "latitude": rec["latitude"],
                "longitude": rec["longitude"],
                "category": "animal",
                "species": "tiger",
                "species_confidence": sp.tiger_confidence,
                "reid_matched_tiger_id": assigned_tiger_id,
                "reid_similarity": match_res.similarity_score,
                "reid_confidence_level": match_res.confidence_level,
                "bbox_xyxy": str(sp.bbox_xyxy) if sp.bbox_xyxy else "[]",
                "status": "tiger_confirmed",
            })

            # Run Explainable Alerts Engine
            alerts = self.alert_engine.evaluate_new_sighting(
                tiger_id=assigned_tiger_id,
                current_station_id=rec["inferred_camera_id"],
                current_timestamp=rec["timestamp"],
                current_lat=rec["latitude"],
                current_lon=rec["longitude"],
                reid_similarity=match_res.similarity_score,
            )
            for a in alerts:
                log_audit("ALERT_RAISED", {
                    "alert_id": a.get("alert_id"),
                    "title": a.get("title"),
                    "severity": a.get("severity"),
                    "tiger_id": assigned_tiger_id,
                })
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

        # Prolonged Absence Check (R5): evaluate every known tiger as of the latest survey batch
        batch_timestamps = [r.get("timestamp") for r in valid_records if r.get("timestamp")]
        eval_timestamp = max(batch_timestamps) if batch_timestamps else datetime.now().isoformat()
        absence_alerts = self.alert_engine.evaluate_all_absences(
            current_timestamp=eval_timestamp
        )
        for a in absence_alerts:
            log_audit("ABSENCE_ALERT_RAISED", {
                "alert_id": a.get("alert_id"),
                "title": a.get("title"),
                "severity": a.get("severity"),
                "tiger_id": a.get("tiger_id"),
            })
        all_generated_alerts.extend(absence_alerts)

        elapsed = time.time() - start_time
        summary = {
            "version": VERSION,
            "pipeline_timestamp": datetime.now().isoformat(),
            "runtime_seconds": round(elapsed, 2),
            "throughput_img_per_sec": round(total_discovered / max(0.01, elapsed), 2),
            "total_images_scanned": total_discovered,
            "corrupt_quarantined": corrupt_count,
            "blanks_quarantined": len(blank_candidates),
            "review_flagged": len(review_candidates),
            "humans_protected": len(human_candidates),
            "non_target_wildlife": len(non_target_records),
            "tigers_identified": len(tiger_records),
            "unique_individuals": len(self.db.get_all_tigers()),
            "alerts_generated": len(all_generated_alerts),
            "alerts": all_generated_alerts,
        }

        # ── Export All 6 Structured Deliverables ──────────────────────────────
        self._export_deliverables(
            out_dir=out_dir,
            summary=summary,
            detections_rows=detections_csv_rows,
            quarantine_rows=quarantine_manifest_rows,
            alerts=all_generated_alerts,
            audit_log=audit_log,
        )

        self._print_final_summary(summary)
        return summary

    def _export_deliverables(
        self,
        out_dir: Path,
        summary: Dict,
        detections_rows: List[Dict],
        quarantine_rows: List[Dict],
        alerts: List[Dict],
        audit_log: List[Dict],
    ):
        """Export the 6 required structured evaluation deliverables."""
        # 1. results.json
        with open(out_dir / "results.json", "w") as f:
            json.dump(summary, f, indent=2)

        # 2. detections.csv
        det_csv_path = out_dir / "detections.csv"
        det_fields = [
            "detection_id", "image_id", "file_name", "station_id", "timestamp",
            "latitude", "longitude", "category", "species", "species_confidence",
            "reid_matched_tiger_id", "reid_similarity", "reid_confidence_level",
            "bbox_xyxy", "status"
        ]
        with open(det_csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=det_fields)
            writer.writeheader()
            for r in detections_rows:
                writer.writerow(r)

        # 3. quarantine_manifest.csv
        q_csv_path = out_dir / "quarantine_manifest.csv"
        q_fields = ["file_name", "original_path", "station_id", "category", "reason", "sha256_hash", "timestamp", "is_reversible"]
        with open(q_csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=q_fields)
            writer.writeheader()
            for r in quarantine_rows:
                writer.writerow(r)

        # 4. alerts.json
        with open(out_dir / "alerts.json", "w") as f:
            json.dump(alerts, f, indent=2)

        # 5. audit.log
        with open(out_dir / "audit.log", "w") as f:
            for entry in audit_log:
                f.write(json.dumps(entry) + "\n")

        # 6. occupancy.geojson
        geojson_data = self._generate_occupancy_geojson()
        with open(out_dir / "occupancy.geojson", "w") as f:
            json.dump(geojson_data, f, indent=2)

        print(f"\n📦 Successfully generated and saved 6 structured deliverables to {out_dir}:")
        print(f"  • {out_dir / 'results.json'}")
        print(f"  • {out_dir / 'detections.csv'} ({len(detections_rows)} rows)")
        print(f"  • {out_dir / 'quarantine_manifest.csv'} ({len(quarantine_rows)} rows)")
        print(f"  • {out_dir / 'occupancy.geojson'}")
        print(f"  • {out_dir / 'alerts.json'} ({len(alerts)} alerts)")
        print(f"  • {out_dir / 'audit.log'} ({len(audit_log)} events)")

    def _generate_occupancy_geojson(self) -> Dict:
        """Generate GeoJSON FeatureCollection with stations, tiger centroids, and movement paths."""
        features = []

        # Stations
        for stn_id, data in PENCH_DEFAULT_STATIONS.items():
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [data["lon"], data["lat"]]
                },
                "properties": {
                    "feature_type": "camera_station",
                    "station_id": stn_id,
                    "zone": data.get("zone", "Core"),
                    "village_dist_km": data.get("village_km", 5.0),
                }
            })

        # Tigers & Movements
        for t in self.db.get_all_tigers():
            tid = t["tiger_id"]
            history = self.db.get_tiger_movement_history(tid)
            if history:
                coords = [[h["longitude"], h["latitude"]] for h in history]
                if len(coords) >= 2:
                    features.append({
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": coords
                        },
                        "properties": {
                            "feature_type": "movement_trajectory",
                            "tiger_id": tid,
                            "sightings_count": len(history),
                            "first_seen": history[0]["timestamp"],
                            "last_seen": history[-1]["timestamp"],
                        }
                    })

                # Centroid
                c_lat = t.get("current_centroid_lat") or t.get("centroid_lat")
                c_lon = t.get("current_centroid_lon") or t.get("centroid_lon")
                if c_lat and c_lon:
                    features.append({
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [c_lon, c_lat]
                        },
                        "properties": {
                            "feature_type": "tiger_occupancy_centroid",
                            "tiger_id": tid,
                            "home_range_km2": t.get("home_range_area_km2", 0.0),
                            "last_seen": t.get("last_seen"),
                        }
                    })

        return {
            "type": "FeatureCollection",
            "features": features,
        }

    def _print_final_summary(self, summary: dict):
        print("\n" + "=" * 80)
        print("  INGESTION & INTELLIGENCE RUN COMPLETE")
        print("=" * 80)
        print(f"  Total Images Ingested     : {summary['total_images_scanned']}")
        print(f"  Throughput                : {summary.get('throughput_img_per_sec', 0)} img/s")
        print(f"  Corrupt Quarantined       : {summary['corrupt_quarantined']}")
        print(f"  Blank Frames Quarantined  : {summary['blanks_quarantined']}")
        print(f"  Review Flagged (Preserved): {summary.get('review_flagged', 0)}")
        print(f"  Humans Protected (Masked) : {summary['humans_protected']}")
        print(f"  Non-Target Wildlife Saved : {summary['non_target_wildlife']}")
        print(f"  Individual Tigers Sighted : {summary['tigers_identified']}")
        print(f"  Total Tiger Profiles      : {summary['unique_individuals']}")
        print(f"  Actionable Alerts Raised  : {summary['alerts_generated']}")
        print(f"  Total Runtime             : {summary['runtime_seconds']}s")
        print("=" * 80)
        if summary["alerts"]:
            print("\n🚨 CRITICAL & ACTIONABLE ALERTS:")
            for a in summary["alerts"]:
                print(f"  [{a['severity']}] {a['title']}")
                print(f"    ↳ {a['explanation']}")
        print("=" * 80 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Pench Tiger Reserve Movement Intelligence Pipeline")
    parser.add_argument("--input", "-i", default="tiger-intelligence/data/raw", help="Path to raw camera trap SD card folder")
    parser.add_argument("--db", "-d", default="tiger-intelligence/database/tiger.db", help="Path to SQLite database")
    parser.add_argument("--output", "-o", default="tiger-intelligence/data", help="Output directory for structured deliverables")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without copying files")

    args = parser.parse_args()
    pipeline = TigerIntelligencePipeline(db_path=args.db)
    pipeline.process_sd_card(raw_input_dir=args.input, output_base_dir=args.output, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
