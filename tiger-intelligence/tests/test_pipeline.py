"""
test_pipeline.py — Comprehensive Test Suite for Pench Tiger Intelligence System
"""

import sys
import unittest
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
        # Create a synthetic image and test candidate extraction
        test_img_path = Path("tiger-intelligence/data/raw/IMG_TEST_CROP.jpg")
        test_img_path.parent.mkdir(parents=True, exist_ok=True)
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
        db_path = Path("tiger-intelligence/database/test_effort.db")
        if db_path.exists():
            db_path.unlink()
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

        # Cleanup
        if db_path.exists():
            db_path.unlink()


if __name__ == "__main__":
    unittest.main()
