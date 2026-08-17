"""
test_e2e_acceptance.py — Full End-to-End Acceptance Test for Pench Tiger Intelligence System
Verifies the complete operational lifecycle from raw SD card ingestion to structured deliverables.
"""

import csv
import json
import shutil
import sys
import unittest
from datetime import datetime
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.alerts.engine import AlertEngine
from app.config import (
    ALERT_ABSENCE_MULTIPLIER,
    REID_CONFIDENT_THRESHOLD,
    REID_REVIEW_THRESHOLD,
    TRIAGE_KEEP_THRESHOLD,
    TRIAGE_QUARANTINE_THRESHOLD,
)
from app.database.db import TigerDatabase
from app.pipeline import TigerIntelligencePipeline


class TestEndToEndAcceptance(unittest.TestCase):

    def setUp(self):
        self.test_dir = PROJECT_ROOT / "tests" / "scratch_e2e"
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
        self.test_dir.mkdir(parents=True, exist_ok=True)

        self.db_path = self.test_dir / "test_tiger.db"
        self.out_dir = self.test_dir / "deliverables"
        self.raw_sdcard = PROJECT_ROOT / "data" / "test_messy_sdcard"

    def tearDown(self):
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)

    def test_full_pipeline_acceptance_lifecycle(self):
        """Execute full end-to-end ingestion and verify deliverables, DB relations, and idempotency."""
        # 1. Initialize pipeline with clean test DB and deliverables output folder
        pipeline = TigerIntelligencePipeline(
            db_path=str(self.db_path),
            keep_threshold=TRIAGE_KEEP_THRESHOLD,
            quarantine_threshold=TRIAGE_QUARANTINE_THRESHOLD,
        )

        # 2. Process messy SD-card dataset
        summary = pipeline.process_sd_card(
            raw_input_dir=str(self.raw_sdcard),
            output_base_dir=str(self.out_dir),
            dry_run=False,
        )

        # 3. Verify high-level summary properties
        self.assertGreater(summary["total_images_scanned"], 0, "Must scan images from SD card")
        self.assertGreaterEqual(summary["corrupt_quarantined"], 1, "Must catch corrupt file")
        self.assertIn("throughput_img_per_sec", summary)
        self.assertIn("runtime_seconds", summary)

        # 4. Verify all 6 structured deliverables exist on disk
        results_json_path = self.out_dir / "results.json"
        detections_csv_path = self.out_dir / "detections.csv"
        quarantine_csv_path = self.out_dir / "quarantine_manifest.csv"
        geojson_path = self.out_dir / "occupancy.geojson"
        alerts_json_path = self.out_dir / "alerts.json"
        audit_log_path = self.out_dir / "audit.log"

        self.assertTrue(results_json_path.exists(), "results.json must exist")
        self.assertTrue(detections_csv_path.exists(), "detections.csv must exist")
        self.assertTrue(quarantine_csv_path.exists(), "quarantine_manifest.csv must exist")
        self.assertTrue(geojson_path.exists(), "occupancy.geojson must exist")
        self.assertTrue(alerts_json_path.exists(), "alerts.json must exist")
        self.assertTrue(audit_log_path.exists(), "audit.log must exist")

        # 5. Validate GeoJSON structure
        with open(geojson_path, "r") as f:
            geojson_data = json.load(f)
        self.assertEqual(geojson_data.get("type"), "FeatureCollection")
        self.assertIsInstance(geojson_data.get("features"), list)
        self.assertGreater(len(geojson_data["features"]), 0, "GeoJSON must contain camera stations and tracks")

        # 6. Validate Quarantine Manifest
        with open(quarantine_csv_path, "r") as f:
            reader = csv.DictReader(f)
            q_rows = list(reader)
        self.assertGreater(len(q_rows), 0, "Quarantine manifest must contain rows")
        for qr in q_rows:
            self.assertIn("sha256_hash", qr)
            self.assertIn("reason", qr)
            self.assertIn("category", qr)

        # 7. Validate Database Integrity
        db = TigerDatabase(self.db_path)
        all_tigers = db.get_all_tigers()
        self.assertGreater(len(all_tigers), 0, "At least one tiger must be registered in the catalog")

        # 8. Human Review Queue & Correction Lifecycle
        # Register image row first to satisfy foreign keys
        db.record_image(
            image_id="IMG_E2E_TEST",
            original_path=str(self.raw_sdcard / "camera17" / "STN04_20260303_190000_TIGER_UNSEEN.JPG"),
            file_name="STN04_20260303_190000_TIGER_UNSEEN.JPG",
            file_size_bytes=1024,
            source_folder="camera17",
            station_id="STN01",
        )
        # Seed an ambiguous detection in the review queue
        db.record_detection(
            detection_id="DET_E2E_REVIEW",
            image_id="IMG_E2E_TEST",
            station_id="STN01",
            timestamp="2026-03-05T10:00:00",
            is_animal=True,
            is_human=False,
            is_vehicle=False,
            is_blank=False,
            detected_species="tiger",
            species_confidence=0.89,
            reid_matched_tiger_id=all_tigers[0]["tiger_id"],
            reid_similarity=0.56,
            reid_confidence_level="MEDIUM_REVIEW_REQUIRED",
        )

        pending = db.get_pending_reviews()
        self.assertTrue(any(p["detection_id"] == "DET_E2E_REVIEW" for p in pending))

        # Officer confirms the match
        target_tid = all_tigers[0]["tiger_id"]
        ok = db.apply_human_correction(
            detection_id="DET_E2E_REVIEW",
            human_decision="CONFIRMED",
            corrected_tiger_id=target_tid,
            actor="OFFICER_CHOUDHARY",
        )
        self.assertTrue(ok)

        # Confirm it is no longer pending
        pending_after = db.get_pending_reviews()
        self.assertFalse(any(p["detection_id"] == "DET_E2E_REVIEW" for p in pending_after))

        # Assert movement record was synced for target tiger
        m_hist = db.get_tiger_movement_history(target_tid)
        self.assertTrue(any(m["detection_id"] == "DET_E2E_REVIEW" for m in m_hist), "Confirmed sighting must sync to movement records")

        # Officer Reassignment test: Reassign DET_E2E_REVIEW to a different tiger T-PENCH-999 (new tiger)
        ok_reassign = db.apply_human_correction(
            detection_id="DET_E2E_REVIEW",
            human_decision="NEW_TIGER",
            corrected_tiger_id="T-PENCH-999",
            actor="OFFICER_PATIL",
        )
        self.assertTrue(ok_reassign)
        new_tiger_m = db.get_tiger_movement_history("T-PENCH-999")
        self.assertEqual(len(new_tiger_m), 1, "Reassigned sighting must migrate to new tiger movement records")
        self.assertEqual(new_tiger_m[0]["detection_id"], "DET_E2E_REVIEW")

        # 8b. Alert State Machine Enforcement Test
        with db._get_connection() as conn:
            alert_row = conn.execute("SELECT alert_id FROM alerts LIMIT 1").fetchone()
        if alert_row:
            test_aid = alert_row["alert_id"]
            # Legal: OPEN -> ACKNOWLEDGED
            res_ack = db.update_alert_status(test_aid, "ACKNOWLEDGED", actor="OFFICER_PATIL", notes="Acknowledged")
            self.assertEqual(res_ack["new_status"], "ACKNOWLEDGED")
            # Legal: ACKNOWLEDGED -> RESOLVED
            res_res = db.update_alert_status(test_aid, "RESOLVED", actor="OFFICER_PATIL", notes="Resolved in field")
            self.assertEqual(res_res["new_status"], "RESOLVED")
            # Illegal: RESOLVED -> ACKNOWLEDGED (Must fail with ValueError)
            with self.assertRaises(ValueError):
                db.update_alert_status(test_aid, "ACKNOWLEDGED", actor="OFFICER_PATIL", notes="Illegal transition")

        # 9. Prolonged Absence Test
        # Build 3 historical sightings for the tiger with 5-day intervals
        t_target = all_tigers[0]["tiger_id"]
        hist_timestamps = [
            "2026-01-01T10:00:00",
            "2026-01-06T10:00:00",
            "2026-01-11T10:00:00",
        ]
        alert_engine = AlertEngine(db)
        # Check absence 30 days later (gap = 30d > 3*5d = 15d threshold)
        abs_alert = alert_engine.check_absence_anomaly(
            tiger_id=t_target,
            sighting_timestamps=hist_timestamps,
            known_station_ids=["STN01", "STN02"],
            current_timestamp="2026-02-10T10:00:00",
        )
        self.assertIsNotNone(abs_alert, "Absence alert must trigger for 30d gap on 5d baseline")
        self.assertEqual(abs_alert["alert_type"], "PROLONGED_ABSENCE")
        self.assertEqual(abs_alert["severity"], "CRITICAL")
        self.assertIsNone(abs_alert["station_id"], "Absence alert station_id must be NULL")

        # 10. Pipeline Idempotency (Processing same SD card again must not duplicate rows)
        summary_run2 = pipeline.process_sd_card(
            raw_input_dir=str(self.raw_sdcard),
            output_base_dir=str(self.out_dir),
            dry_run=False,
        )
        with db._get_connection() as conn:
            image_count = conn.execute("SELECT COUNT(*) FROM images").fetchone()[0]
            # Since raw_sdcard has fixed files + our test image, image_count is exact
            self.assertEqual(image_count, summary["total_images_scanned"] + 1)


if __name__ == "__main__":
    unittest.main()
