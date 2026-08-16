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
from app.reid.extractor import TigerStripeFeatureExtractor
from app.reid.matcher import TigerReIDMatcher


class TestTigerIntelligence(unittest.TestCase):

    def test_haversine_distance(self):
        # Known distance between C01 (21.715, 79.312) and C02 (21.728, 79.335)
        d = haversine_distance_km(21.715, 79.312, 21.728, 79.335)
        self.assertTrue(2.0 < d < 3.5, f"Distance {d} km should be in realistic range")

    def test_convex_hull_and_mcp_area(self):
        # Square of 0.1 deg x 0.1 deg ≈ 11.1km x 10.3km ≈ 114 km²
        points = [
            (21.70, 79.30),
            (21.80, 79.30),
            (21.80, 79.40),
            (21.70, 79.40),
            (21.75, 79.35),  # Interior point
        ]
        hull = calculate_convex_hull(points)
        self.assertEqual(len(hull), 4, "Convex hull of a square with interior point must have 4 vertices")
        area = polygon_area_km2(hull)
        self.assertTrue(90.0 < area < 140.0, f"Calculated area {area} km² is realistic")

    def test_reid_embedding_properties(self):
        extractor = TigerStripeFeatureExtractor()
        # Create synthetic RGB test image
        dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        emb = extractor.extract_embedding(dummy_img)
        self.assertEqual(emb.shape, (768,), "Embedding dimension must be 768")
        norm = np.linalg.norm(emb)
        self.assertAlmostEqual(norm, 1.0, places=4, msg="Embedding must be strictly L2-normalized")

    def test_reid_matcher_empty_catalog(self):
        matcher = TigerReIDMatcher()
        query = np.random.randn(768).astype(np.float32)
        query /= np.linalg.norm(query)
        res = matcher.match(query, reference_catalog=[])
        self.assertTrue(res.is_new_individual, "Empty catalog must classify query as new individual")
        self.assertEqual(res.confidence_level, "LOW_NEW_INDIVIDUAL")

    def test_survey_effort_correction(self):
        # Setup temporary test database
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

        # Case A: Tiger appears at station C05 which is a NEW deployment (active_from = 2026-08-01)
        alerts_new_cam = alert_engine.evaluate_new_sighting(
            tiger_id="T-007",
            current_station_id="C05",
            current_timestamp="2026-08-05T10:00:00",
            current_lat=21.781,
            current_lon=79.372,
        )
        expansion_alerts = [a for a in alerts_new_cam if a["alert_type"] == "NEW_STATION_EXPANSION"]
        self.assertEqual(len(expansion_alerts), 0, "New camera deployment should NOT trigger NEW_STATION_EXPANSION alert (survey effort correction)")

        # Case B: Tiger appears at station C02 which was active for years (active_from = 2020-01-01)
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
