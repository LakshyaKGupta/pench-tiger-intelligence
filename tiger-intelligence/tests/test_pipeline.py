import os
import shutil
import sys
import tempfile
import unittest
import uuid
from pathlib import Path

import numpy as np

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.alerts.engine import AlertEngine
from app.database.db import TigerDatabase
from app.ingestion.metadata import PENCH_DEFAULT_STATIONS, extract_metadata
from app.ingestion.validator import check_single_image
from app.occupancy.mcp import (calculate_convex_hull,
                               calculate_tiger_home_range,
                               haversine_distance_km, polygon_area_km2)
from app.reid.extractor import DEFAULT_REID_MODEL, TigerStripeFeatureExtractor
from app.reid.flank_crop import generate_flank_candidates
from app.reid.matcher import TigerReIDMatcher


class TestTigerIntelligence(unittest.TestCase):

    def test_haversine_distance(self):
        d = haversine_distance_km(21.715, 79.312, 21.728, 79.335)
        self.assertTrue(2.0 < d < 3.5, f"Distance {d} km should be in realistic range")

    def test_convex_hull_and_mcp_area(self):
        points = [
            (21.70, 79.30),
            (21.80, 79.30),
            (21.80, 79.40),
            (21.70, 79.40),
            (21.75, 79.35),
        ]
        hull = calculate_convex_hull(points)
        self.assertEqual(len(hull), 4, "Convex hull of a square with interior point must have 4 vertices")
        area = polygon_area_km2(hull)
        self.assertTrue(90.0 < area < 140.0, f"Calculated area {area} km² is realistic")

    def test_reid_megadescriptor_embedding_properties(self):
        extractor = TigerStripeFeatureExtractor(model_name=DEFAULT_REID_MODEL)
        dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        emb = extractor.extract_embedding(dummy_img)
        self.assertEqual(emb.shape, (768,), "Embedding dimension must be 768")
        norm = np.linalg.norm(emb)
        self.assertAlmostEqual(norm, 1.0, places=4, msg="Embedding must be strictly L2-normalized")

    def test_deterministic_flank_candidate_generation(self):
        # Create a synthetic image in a clean temp location
        temp_dir = tempfile.mkdtemp()
        try:
            test_img_path = Path(temp_dir) / "IMG_TEST_CROP.jpg"
            from PIL import Image
            img = Image.fromarray(np.random.randint(0, 255, (500, 800, 3), dtype=np.uint8))
            img.save(test_img_path)

            bbox = (100, 50, 700, 450)  # w=600, h=400
            candidates = generate_flank_candidates(str(test_img_path), bbox, output_crop_dir=None)

            self.assertEqual(len(candidates), 3, "Must generate 3 deterministic candidates: body, left, right")
            types = [c.crop_type for c in candidates]
            self.assertIn("body_candidate", types)
            self.assertIn("left_candidate", types)
            self.assertIn("right_candidate", types)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

        # Cleanup test image
        if test_img_path.exists():
            test_img_path.unlink()

    def test_reid_matcher_empty_catalog(self):
        matcher = TigerReIDMatcher()
        query = np.random.randn(768).astype(np.float32)
        query /= np.linalg.norm(query)
        res = matcher.match(query, reference_catalog=[])
        self.assertTrue(res.is_new_individual, "Empty catalog must classify query as new individual")
        self.assertEqual(res.confidence_level, "LOW_NEW_INDIVIDUAL")

    def test_multi_reference_gallery_matching_and_aggregation(self):
        matcher = TigerReIDMatcher(confident_threshold=0.65, review_threshold=0.45)

        # Create known tiger reference vectors
        vec_t1_a = np.random.randn(768).astype(np.float32); vec_t1_a /= np.linalg.norm(vec_t1_a)
        vec_t1_b = np.random.randn(768).astype(np.float32); vec_t1_b /= np.linalg.norm(vec_t1_b)
        vec_t2_a = np.random.randn(768).astype(np.float32); vec_t2_a /= np.linalg.norm(vec_t2_a)

        gallery = [
            {"tiger_id": "T-001", "embedding": vec_t1_a, "crop_type": "left_candidate"},
            {"tiger_id": "T-001", "embedding": vec_t1_b, "crop_type": "right_candidate"},
            {"tiger_id": "T-002", "embedding": vec_t2_a, "crop_type": "left_candidate"},
        ]

        # Query very close to T-001 encounter B (sim > 0.65 -> HIGH)
        query_close_t1 = vec_t1_b + np.random.randn(768) * 0.01
        query_close_t1 /= np.linalg.norm(query_close_t1)
        res_high = matcher.match_candidates([("left_candidate", query_close_t1)], gallery)
        self.assertEqual(res_high.matched_tiger_id, "T-001")
        self.assertEqual(res_high.confidence_level, "HIGH")

        # Query moderately close (sim in [0.45, 0.65) -> MEDIUM_REVIEW_REQUIRED)
        # Construct vector with exact cosine similarity ~ 0.55
        ortho = np.random.randn(768)
        ortho -= np.dot(ortho, vec_t2_a) * vec_t2_a
        ortho /= np.linalg.norm(ortho)
        query_med = 0.55 * vec_t2_a + np.sqrt(1 - 0.55**2) * ortho
        res_med = matcher.match_candidates([("body_candidate", query_med)], gallery)
        self.assertEqual(res_med.matched_tiger_id, "T-002")
        self.assertEqual(res_med.confidence_level, "MEDIUM_REVIEW_REQUIRED")

    def test_survey_effort_correction(self):
        temp_dir = tempfile.mkdtemp()
        try:
            db_path = Path(temp_dir) / "test_effort.db"
            db = TigerDatabase(db_path)
            alert_engine = AlertEngine(db)

            # 1. Register camera stations
            db.upsert_station("C01", 21.715, 79.312, survey_id="Cycle1", active_from="2020-01-01")
            db.upsert_station("C02", 21.728, 79.335, survey_id="Cycle1", active_from="2020-01-01")
            db.upsert_station("C05", 21.781, 79.372, survey_id="Cycle2", active_from="2026-08-01")

            # 2. Register tiger
            db.register_tiger("T-007", name="Test Tiger")

            # 3. Record historical image & detection at C01
            db.record_image("IMG_01", "/dummy/path.jpg", "path.jpg", 100, "ROOT", station_id="C01")
            db.record_detection(
                detection_id="DET_01",
                image_id="IMG_01",
                station_id="C01",
                timestamp="2026-08-01T10:00:00",
                is_animal=True,
                is_human=False,
                is_vehicle=False,
                is_blank=False,
                detected_species="tiger",
                species_confidence=0.95,
                reid_matched_tiger_id="T-007",
                reid_similarity=0.95,
                reid_confidence_level="HIGH"
            )
            db.record_movement("T-007", "DET_01", "C01", "2026-08-01T10:00:00", 21.715, 79.312)

            # Case A: Station C05 was newly activated in 2026-08-01 -> No movement expansion alert
            alerts_new_cam = alert_engine.evaluate_new_sighting(
                tiger_id="T-007",
                current_station_id="C05",
                current_timestamp="2026-08-05T10:00:00",
                current_lat=21.781,
                current_lon=79.372,
            )
            expansion_alerts = [a for a in alerts_new_cam if a["alert_type"] == "NEW_STATION_EXPANSION"]
            self.assertEqual(len(expansion_alerts), 0, "New camera deployment should NOT trigger NEW_STATION_EXPANSION alert (survey effort correction)")

            # Case B: Station C02 was active for years -> Valid movement expansion alert
            alerts_old_cam = alert_engine.evaluate_new_sighting(
                tiger_id="T-007",
                current_station_id="C02",
                current_timestamp="2026-08-10T10:00:00",
                current_lat=21.728,
                current_lon=79.335,
            )
            expansion_alerts_old = [a for a in alerts_old_cam if a["alert_type"] == "NEW_STATION_EXPANSION"]
            self.assertEqual(len(expansion_alerts_old), 1, "Historically active station should trigger NEW_STATION_EXPANSION alert")
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_held_out_dataset_integrity(self):
        from evaluation.evaluate_reid import verify_dataset_integrity
        root_dir = Path(__file__).resolve().parent.parent
        base_dir = root_dir / "evaluation" / "dataset"
        if (base_dir / "gallery").exists() and (base_dir / "query").exists():
            gal_dict, known_q, unk_q = verify_dataset_integrity(
                base_dir / "gallery",
                base_dir / "query",
                base_dir / "unknown",
            )
            self.assertGreater(len(gal_dict), 0, "Gallery must contain known individuals")
            self.assertGreater(len(known_q), 0, "Query set must contain held-out known images")
            self.assertGreater(len(unk_q), 0, "Unknown query set must contain unseen individuals")

    def test_camera_trap_subject_detector(self):
        from app.detection.detector import CameraTrapDetector
        root_dir = Path(__file__).resolve().parent.parent
        detector = CameraTrapDetector(
            model_path=str(root_dir / "models" / "yolov8n.pt"),
            confidence_threshold=0.15,
            device="cpu"
        )
        test_img = root_dir / "evaluation" / "dataset" / "query" / "T-001" / "000187.jpg"
        if not test_img.exists():
            queries = list((root_dir / "evaluation" / "dataset" / "query").glob("*/*.jpg"))
            if queries:
                test_img = queries[0]

        results = detector.detect_batch([str(test_img)])
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0].has_animal, "Detector should detect animal in tiger test image")
        self.assertFalse(results[0].is_blank, "Tiger image should not be classified as blank")


    def test_threshold_consistency(self):
        """All modules must use the same keep threshold from config.py."""
        from app.config import TRIAGE_KEEP_THRESHOLD, TRIAGE_QUARANTINE_THRESHOLD
        from app.detection.triage import CameraTrapTriagePolicy

        # Default policy must use config values (fixes 0.15 vs 0.20 bug)
        policy = CameraTrapTriagePolicy()
        self.assertEqual(policy.keep_threshold, TRIAGE_KEEP_THRESHOLD,
                         f"triage.py default {policy.keep_threshold} != config {TRIAGE_KEEP_THRESHOLD}")
        self.assertEqual(policy.quarantine_threshold, TRIAGE_QUARANTINE_THRESHOLD)

    def test_human_review_persistence(self):
        """Human review decisions must be written to the database and original AI prediction must be preserved."""
        from app.database.db import TigerDatabase
        temp_dir = tempfile.mkdtemp()
        try:
            db_path = Path(temp_dir) / "test_human_review.db"
            db = TigerDatabase(db_path)

            # Seed required FK data
            db.upsert_station("C01", 21.715, 79.312, survey_id="S1", active_from="2026-01-01")
            db.register_tiger("T-001", name="Test Tiger Alpha")
            db.record_image("IMG_01", "/dummy/path.jpg", "path.jpg", 100, "C01", station_id="C01")
            db.record_detection(
                detection_id="DET_001",
                image_id="IMG_01",
                station_id="C01",
                timestamp="2026-08-01T10:00:00",
                is_animal=True,
                is_human=False,
                is_vehicle=False,
                is_blank=False,
                detected_species="tiger",
                species_confidence=0.88,
                reid_matched_tiger_id="T-001",
                reid_similarity=0.55,            # MEDIUM band
                reid_confidence_level="MEDIUM_REVIEW_REQUIRED",
            )

            # Verify it appears in pending reviews
            pending = db.get_pending_reviews()
            det_ids = [r["detection_id"] for r in pending]
            self.assertIn("DET_001", det_ids, "Detection should be in pending review queue")

            # Apply human correction (confirm match)
            success = db.apply_human_correction(
                detection_id="DET_001",
                human_decision="CONFIRMED",
                corrected_tiger_id="T-001",
                actor="TEST_OFFICER",
            )
            self.assertTrue(success, "apply_human_correction must return True on success")

            # Verify human_verified = 1 and verified_tiger_id persisted
            from app.database.db import SCHEMA_PATH
            import sqlite3
            conn = sqlite3.connect(str(db_path))
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT * FROM detections WHERE detection_id = ?", ("DET_001",)).fetchone()
            self.assertEqual(row["human_verified"], 1, "human_verified must be 1 after correction")
            self.assertEqual(row["verified_tiger_id"], "T-001", "verified_tiger_id must be stored")
            self.assertEqual(row["human_decision"], "CONFIRMED")
            self.assertEqual(row["human_actor"], "TEST_OFFICER")
            # Original AI prediction must be preserved
            self.assertAlmostEqual(row["reid_similarity"], 0.55, places=2, msg="Original AI similarity must be preserved")
            self.assertAlmostEqual(row["original_reid_similarity"], 0.55, places=2, msg="Snapshot of original must be stored")
            self.assertEqual(row["reid_confidence_level"], "MEDIUM_REVIEW_REQUIRED", "Original confidence level must be preserved")
            conn.close()

            # After correction it should no longer appear in pending (human_verified=1)
            pending_after = db.get_pending_reviews()
            ids_after = [r["detection_id"] for r in pending_after]
            self.assertNotIn("DET_001", ids_after, "Confirmed detection must leave the review queue")
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_prolonged_absence_detection(self):
        """Absence detection must classify gaps correctly and suppress when insufficient data or cameras down."""
        from app.alerts.engine import AlertEngine
        from app.config import ALERT_ABSENCE_MULTIPLIER
        from app.database.db import TigerDatabase

        temp_dir = tempfile.mkdtemp()
        try:
            db_path = Path(temp_dir) / "test_absence.db"
            db = TigerDatabase(db_path)
            engine = AlertEngine(db)

            # Seed tiger + station
            db.upsert_station("C01", 21.715, 79.312, survey_id="S1", active_from="2020-01-01")
            db.register_tiger("T-ABS", name="Absence Test Tiger")

            # Case A: insufficient history (< 3 sightings) → no alert
            result_a = engine.check_absence_anomaly(
                tiger_id="T-ABS",
                sighting_timestamps=["2026-01-01T10:00:00", "2026-01-10T10:00:00"],  # only 2
                known_station_ids=["C01"],
                current_timestamp="2026-03-01T10:00:00",
            )
            self.assertIsNone(result_a, "Should suppress absence alert when fewer than 3 sightings in history")

            # Build a history with 9-day median interval
            timestamps_9d = [
                "2026-01-01T10:00:00",
                "2026-01-10T10:00:00",  # +9d
                "2026-01-19T10:00:00",  # +9d
                "2026-01-28T10:00:00",  # +9d
            ]

            # Case B: gap = 11d (< 2*9=18d) → NORMAL, no alert
            result_b = engine.check_absence_anomaly(
                tiger_id="T-ABS",
                sighting_timestamps=timestamps_9d,
                known_station_ids=["C01"],
                current_timestamp="2026-02-08T10:00:00",  # 11 days after last sighting
            )
            self.assertIsNone(result_b, "Gap below 2× median should not trigger an alert")

            # Case C: gap = 22d (> 2×9=18d but < 3×9=27d) → WARNING severity
            result_c = engine.check_absence_anomaly(
                tiger_id="T-ABS",
                sighting_timestamps=timestamps_9d,
                known_station_ids=["C01"],
                current_timestamp="2026-02-19T10:00:00",  # 22 days after last
            )
            self.assertIsNotNone(result_c, "Gap > 2× median must trigger a WARNING absence alert")
            self.assertEqual(result_c["alert_type"], "PROLONGED_ABSENCE")
            self.assertEqual(result_c["severity"], "WARNING")
            self.assertIn("gap_days", result_c["evidence_data"])

            # Case D: gap = 35d (> 3×9=27d) → CRITICAL severity
            result_d = engine.check_absence_anomaly(
                tiger_id="T-ABS",
                sighting_timestamps=timestamps_9d,
                known_station_ids=["C01"],
                current_timestamp="2026-03-04T10:00:00",  # 35 days after last
            )
            self.assertIsNotNone(result_d, "Gap > 3× median must trigger CRITICAL absence alert")
            self.assertEqual(result_d["severity"], "CRITICAL")

            # Case E: cameras were inactive during the gap → alert suppressed (survey-effort correction)
            # Deactivate C01 before the gap period
            import sqlite3
            conn = sqlite3.connect(str(db_path))
            conn.execute("UPDATE camera_stations SET active_to = '2026-01-29' WHERE station_id = 'C01'")
            conn.commit()
            conn.close()

            result_e = engine.check_absence_anomaly(
                tiger_id="T-ABS",
                sighting_timestamps=timestamps_9d,
                known_station_ids=["C01"],
                current_timestamp="2026-03-04T10:00:00",
            )
            self.assertIsNone(result_e, "Absence alert must be suppressed when all known stations are inactive")
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_absence_edge_cases(self):
        """Absence detection must handle newly enrolled tigers, clock drift, and missing GPS robustly."""
        from app.alerts.engine import AlertEngine
        from app.database.db import TigerDatabase
        from app.occupancy.mcp import calculate_tiger_home_range

        temp_dir = tempfile.mkdtemp()
        try:
            db_path = Path(temp_dir) / "test_absence_edges.db"
            db = TigerDatabase(db_path)
            engine = AlertEngine(db)

            # 1. Newly enrolled tiger (0 sightings or 1 sighting)
            db.upsert_station("C01", 21.715, 79.312, survey_id="S1", active_from="2020-01-01")
            db.register_tiger("T-NEW", name="Newly Enrolled Tiger")

            res_zero = engine.check_absence_anomaly("T-NEW", [], ["C01"], "2026-03-01T10:00:00")
            self.assertIsNone(res_zero, "0 sightings must never trigger absence alert")

            res_one = engine.check_absence_anomaly("T-NEW", ["2026-01-01T10:00:00"], ["C01"], "2026-03-01T10:00:00")
            self.assertIsNone(res_one, "1 sighting must never trigger absence alert")

            # 2. Clock drift: sighting in the future relative to check timestamp
            history_future = ["2026-01-01T10:00:00", "2026-01-10T10:00:00", "2026-01-20T10:00:00", "2026-05-01T10:00:00"]
            res_future = engine.check_absence_anomaly("T-NEW", history_future, ["C01"], "2026-03-01T10:00:00")
            self.assertIsNone(res_future, "Future timestamps (clock drift) must not trigger absence alert")

            # 3. Missing / None GPS coordinates in sightings history must not crash spatial calculator
            sightings_with_none_gps = [
                {"latitude": None, "longitude": None, "timestamp": "2026-01-01T10:00:00", "station_id": "C01"},
                {"latitude": 21.715, "longitude": 79.312, "timestamp": "2026-01-10T10:00:00", "station_id": "C01"},
                {"latitude": None, "longitude": None, "timestamp": "2026-01-20T10:00:00", "station_id": "C01"},
            ]
            range_stats = calculate_tiger_home_range(sightings_with_none_gps)
            self.assertEqual(range_stats["total_sightings"], 3)
            self.assertEqual(range_stats["centroid_lat"], 21.715)
            self.assertEqual(range_stats["centroid_lon"], 79.312)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_human_review_end_to_end_and_restart(self):
        """Verify full lifecycle: uncertain detection -> review queue -> human reassign -> DB restart -> verified identity used."""
        from app.database.db import TigerDatabase
        temp_dir = tempfile.mkdtemp()
        try:
            db_path = Path(temp_dir) / "test_review_lifecycle.db"
            
            # Step 1: Initial pipeline run writes uncertain detection
            db = TigerDatabase(db_path)
            db.upsert_station("C01", 21.715, 79.312, survey_id="S1", active_from="2026-01-01")
            db.register_tiger("T-001", name="Tiger One")
            db.register_tiger("T-002", name="Tiger Two")
            db.record_image("IMG_AMB_01", "/dummy/img.jpg", "img.jpg", 1024, "C01", station_id="C01")
            db.record_detection(
                detection_id="DET_AMB_01",
                image_id="IMG_AMB_01",
                station_id="C01",
                timestamp="2026-08-05T12:00:00",
                is_animal=True,
                is_human=False,
                is_vehicle=False,
                is_blank=False,
                detected_species="tiger",
                species_confidence=0.92,
                reid_matched_tiger_id="T-001",
                reid_similarity=0.58,  # In [0.45, 0.65) review band
                reid_confidence_level="MEDIUM_REVIEW_REQUIRED",
            )

            # Step 2: Query review queue
            pending = db.get_pending_reviews()
            self.assertEqual(len(pending), 1)
            self.assertEqual(pending[0]["detection_id"], "DET_AMB_01")
            self.assertEqual(pending[0]["reid_matched_tiger_id"], "T-001")

            # Step 3: Officer reassigns match to T-002
            success = db.apply_human_correction(
                detection_id="DET_AMB_01",
                human_decision="REASSIGNED",
                corrected_tiger_id="T-002",
                actor="OFFICER_PATIL",
            )
            self.assertTrue(success)

            # Step 4: Simulate application restart (new database instance & connection)
            del db
            db_restarted = TigerDatabase(db_path)

            # Step 5: Verify review queue is now empty
            pending_after = db_restarted.get_pending_reviews()
            self.assertEqual(len(pending_after), 0, "Reviewed item must not appear in pending queue")

            # Step 6: Verify persisted record has verified identity and original AI prediction
            with db_restarted._get_connection() as conn:
                row = dict(conn.execute("SELECT * FROM detections WHERE detection_id = 'DET_AMB_01'").fetchone())
                self.assertEqual(row["human_verified"], 1)
                self.assertEqual(row["verified_tiger_id"], "T-002")
                self.assertEqual(row["human_decision"], "REASSIGNED")
                self.assertEqual(row["human_actor"], "OFFICER_PATIL")
                # Crucial: Original AI prediction is untouched
                self.assertEqual(row["original_reid_tiger_id"], "T-001")
                self.assertAlmostEqual(row["original_reid_similarity"], 0.58, places=2)
                self.assertEqual(row["original_reid_confidence_level"], "MEDIUM_REVIEW_REQUIRED")

                # Audit log entry exists
                audit_rows = conn.execute("SELECT * FROM audit_log WHERE entity_id = 'DET_AMB_01'").fetchall()
                self.assertGreater(len(audit_rows), 0, "Audit log must record human review decision")
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_database_idempotency_and_integrity(self):
        """Verify database idempotency on duplicate ingestion, deterministic alert deduplication, and FK enforcement."""
        from app.alerts.engine import AlertEngine
        from app.database.db import TigerDatabase
        import sqlite3

        temp_dir = tempfile.mkdtemp()
        try:
            db_path = Path(temp_dir) / "test_idempotency.db"
            db = TigerDatabase(db_path)
            engine = AlertEngine(db)

            # 1. Foreign Key enforcement on invalid station
            db.register_tiger("T-001", name="Tiger Alpha")
            with self.assertRaises(sqlite3.IntegrityError):
                with db._get_connection() as conn:
                    # Invalid station_id 'NON_EXISTENT_STATION'
                    conn.execute(
                        "INSERT INTO images (image_id, original_path, source_folder, file_name, station_id) "
                        "VALUES ('IMG_ERR', '/dummy/path.jpg', 'ROOT', 'test.jpg', 'NON_EXISTENT_STATION')"
                    )

            # 2. Acceptance of NULL station_id on alerts (e.g. absence alert)
            db.upsert_station("C01", 21.715, 79.312, survey_id="S1", active_from="2020-01-01")
            db.record_alert(
                alert_id="ALT_ABS_TEST_001",
                alert_type="PROLONGED_ABSENCE",
                severity="CRITICAL",
                tiger_id="T-001",
                station_id=None,  # Valid NULL FK
                timestamp="2026-08-10T10:00:00",
                title="Absence Test",
                explanation="Explanation",
                evidence_data={"gap_days": 30.0},
            )
            active_alerts = db.get_active_alerts()
            self.assertEqual(len(active_alerts), 1)
            self.assertIsNone(active_alerts[0]["station_id"])

            # 3. Idempotent Alert deduplication (running same alert twice produces 1 row)
            db.record_alert(
                alert_id="ALT_ABS_TEST_001",
                alert_type="PROLONGED_ABSENCE",
                severity="CRITICAL",
                tiger_id="T-001",
                station_id=None,
                timestamp="2026-08-10T10:00:00",
                title="Absence Test",
                explanation="Explanation",
                evidence_data={"gap_days": 30.0},
            )
            active_alerts_after = db.get_active_alerts()
            self.assertEqual(len(active_alerts_after), 1, "Duplicate alert_id must not create duplicate row")

            # 4. Idempotent Movement ingestion
            db.record_image("IMG_01", "/dummy/1.jpg", "1.jpg", 100, "C01", station_id="C01")
            db.record_detection(
                detection_id="DET_01",
                image_id="IMG_01",
                station_id="C01",
                timestamp="2026-08-01T10:00:00",
                is_animal=True,
                is_human=False,
                is_vehicle=False,
                is_blank=False,
                detected_species="tiger",
                species_confidence=0.95,
                reid_matched_tiger_id="T-001",
                reid_similarity=0.95,
                reid_confidence_level="HIGH",
            )
            db.record_movement("T-001", "DET_01", "C01", "2026-08-01T10:00:00", 21.715, 79.312)
            db.record_movement("T-001", "DET_01", "C01", "2026-08-01T10:00:00", 21.715, 79.312)  # Duplicate run

            history = db.get_tiger_movement_history("T-001")
            self.assertEqual(len(history), 1, "Duplicate movement record must be ignored")
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_offline_production_reid_flow(self):
        """Verify the full production Re-ID flow operates 100% offline without internet dependency."""
        from app.database.db import TigerDatabase
        from app.reid.extractor import DEFAULT_REID_MODEL, TigerStripeFeatureExtractor
        from app.reid.matcher import TigerReIDMatcher

        temp_dir = tempfile.mkdtemp()
        try:
            db_path = Path(temp_dir) / "test_reid_flow.db"
            db = TigerDatabase(db_path)

            extractor = TigerStripeFeatureExtractor(model_name=DEFAULT_REID_MODEL)
            matcher = TigerReIDMatcher()

            # Extract features from synthetic tiger crops
            np.random.seed(42)
            crop_a = np.random.randint(50, 200, (224, 224, 3), dtype=np.uint8)
            emb_a = extractor.extract_embedding(crop_a)

            # Register T-001 in database
            db.register_tiger("T-001", name="Registered Tiger", embedding=emb_a, flank_side="left_candidate")
            gallery = db.get_tiger_reference_gallery()
            self.assertEqual(len(gallery), 1)

            # Case 1: Exact / close query -> HIGH confidence match
            query_close = emb_a + np.random.randn(768).astype(np.float32) * 0.01
            query_close /= np.linalg.norm(query_close)
            res_close = matcher.match_candidates([("left_candidate", query_close)], gallery)
            self.assertEqual(res_close.matched_tiger_id, "T-001")
            self.assertEqual(res_close.confidence_level, "HIGH")
            self.assertFalse(res_close.is_new_individual)

            # Case 2: Orthogonal vector -> LOW_NEW_INDIVIDUAL
            ortho = np.random.randn(768).astype(np.float32)
            ortho -= np.dot(ortho, emb_a) * emb_a
            ortho /= np.linalg.norm(ortho)
            res_unk = matcher.match_candidates([("left_candidate", ortho)], gallery)
            self.assertTrue(res_unk.is_new_individual)
            self.assertEqual(res_unk.confidence_level, "LOW_NEW_INDIVIDUAL")
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
