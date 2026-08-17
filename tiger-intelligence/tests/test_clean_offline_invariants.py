"""
test_clean_offline_invariants.py — TIGERTRACK AI Clean-Machine Offline & Truth Invariant Suite
Pench Tiger Reserve Camera Trap Intelligence System

Verifies:
1. 100% Offline MegaDescriptor inference on clean machine (empty HF cache, zero network).
2. Safe media serving whitelist (rejection of non-image extensions).
3. Zero-fabrication empty-database invariants (0.0 confidence, null run, zero false numbers).
4. Triage boundary precision ([0.08, 0.15) review band, sub-threshold noise quarantine).
5. Workstation authentication forensic security invariants.
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from fastapi.testclient import TestClient

from app.auth.hashing import hash_password
from app.auth.sessions import create_session, get_session
from app.database.db import TigerDatabase
from app.detection.detector import ImageDetectionResult, DetectionBox
from app.detection.triage import CameraTrapTriagePolicy, TriageAction
from app.reid.extractor import TigerStripeFeatureExtractor
from app.api.server import app, ALLOWED_MEDIA_EXTENSIONS


class TestCleanOfflineInvariants(unittest.TestCase):

    def test_01_megadescriptor_clean_machine_offline_extraction(self):
        """MegaDescriptor must extract 768-dim embeddings from local file with empty HF cache and zero network."""
        import socket
        isolated_hf_dir = tempfile.mkdtemp()
        old_hf_home = os.environ.get("HF_HOME")
        os.environ["HF_HOME"] = isolated_hf_dir
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"

        # Actively block all outbound network socket connections
        orig_socket = socket.socket
        def blocked_socket(*args, **kwargs):
            raise PermissionError("Zero-Internet Enforcement: Outbound network connections are strictly forbidden in offline mode.")

        socket.socket = blocked_socket

        try:
            extractor = TigerStripeFeatureExtractor()
            self.assertTrue(Path(extractor.model_path).exists(), f"Model path must exist: {extractor.model_path}")
            
            dummy_frame = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
            emb = extractor.extract_embedding(dummy_frame)
            
            self.assertEqual(emb.shape, (768,))
            self.assertAlmostEqual(float(np.linalg.norm(emb)), 1.0, places=4)
        finally:
            socket.socket = orig_socket
            if old_hf_home:
                os.environ["HF_HOME"] = old_hf_home
            else:
                os.environ.pop("HF_HOME", None)

    def test_02_image_serving_extension_whitelist(self):
        """Media streaming endpoint must strictly forbid non-image extensions."""
        client = TestClient(app)
        
        # Prohibited extensions
        for bad_path in ["database/schema.sql", "app/api/server.py", ".env", "config.json"]:
            res = client.get(f"/api/images/serve/{bad_path}")
            self.assertIn(
                res.status_code,
                [403, 404],
                f"Path '{bad_path}' should be blocked (403/404), got {res.status_code}"
            )

    def test_03_empty_database_zero_fabrication_kpis(self):
        """On an empty database, API must return exact zeros and nulls, never fabricated numbers."""
        temp_dir = tempfile.mkdtemp()
        empty_db = TigerDatabase(Path(temp_dir) / "clean_pench.db")

        import app.api.server as srv
        old_db = srv.db
        srv.db = empty_db
        setattr(app.state, "db", empty_db)

        try:
            client = TestClient(app)
            res = client.get("/api/overview")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            
            kpis = data["kpis"]
            self.assertEqual(kpis["total_tigers"], 0)
            self.assertEqual(kpis["total_detections"], 0)
            self.assertEqual(kpis["images_processed"], 0)
            self.assertEqual(kpis["images_awaiting_review"], 0)
            self.assertEqual(kpis["active_alerts_count"], 0)
            self.assertEqual(kpis["identification_confidence"], 0.0, "Confidence must be 0.0 on empty DB")
            self.assertIsNone(data["latest_ingestion_run"], "Latest run must be None on empty DB")
            self.assertEqual(len(data["recent_sightings"]), 0)
            self.assertEqual(len(data["recent_alerts"]), 0)
        finally:
            srv.db = old_db
            setattr(app.state, "db", old_db)

    def test_04_triage_boundary_conditions(self):
        """Triage engine must strictly enforce [0.08, 0.15) review band."""
        policy = CameraTrapTriagePolicy(keep_threshold=0.15, quarantine_threshold=0.08)

        def _make_det(is_blank: bool, conf: float) -> ImageDetectionResult:
            boxes = [] if is_blank else [
                DetectionBox(
                    box_id="b1", class_id=0, class_name="animal", confidence=conf,
                    bbox_xyxy=(0, 0, 50, 50), is_animal=True, is_human=False, is_vehicle=False
                )
            ]
            return ImageDetectionResult(
                image_path="/tmp/test.jpg",
                is_blank=is_blank,
                has_animal=not is_blank,
                has_human=False,
                has_vehicle=False,
                top_class="animal" if not is_blank else "blank",
                top_confidence=conf if not is_blank else 0.0,
                boxes=boxes,
            )

        # High confidence blanks -> QUARANTINE
        self.assertEqual(policy.evaluate(_make_det(True, 0.0)).action, TriageAction.QUARANTINE)
        self.assertEqual(policy.evaluate(_make_det(True, 0.04)).action, TriageAction.QUARANTINE)

        # Sub-threshold animal noise (< 0.08) -> QUARANTINE
        self.assertEqual(policy.evaluate(_make_det(False, 0.0799)).action, TriageAction.QUARANTINE)

        # Review band [0.08, 0.15) -> REVIEW
        self.assertEqual(policy.evaluate(_make_det(False, 0.08)).action, TriageAction.REVIEW)
        self.assertEqual(policy.evaluate(_make_det(False, 0.0801)).action, TriageAction.REVIEW)
        self.assertEqual(policy.evaluate(_make_det(False, 0.1499)).action, TriageAction.REVIEW)

        # Definite detections (>= 0.15) -> KEEP
        self.assertEqual(policy.evaluate(_make_det(False, 0.15)).action, TriageAction.KEEP)
        self.assertEqual(policy.evaluate(_make_det(False, 0.92)).action, TriageAction.KEEP)

    def test_05_auth_deactivated_officer_rejection(self):
        """Deactivated officers must be rejected even with a previously valid token."""
        temp_dir = tempfile.mkdtemp()
        test_db = TigerDatabase(Path(temp_dir) / "auth_test.db")
        test_db.create_officer("OFFICER-DEACT", "Deact Officer", "OFFICER", hash_password("pass123!"))

        with test_db._get_connection() as conn:
            token = create_session("OFFICER-DEACT", conn)
            # Valid initially
            self.assertIsNotNone(get_session(token, conn))

        # Deactivate
        test_db.deactivate_officer("OFFICER-DEACT")

        with test_db._get_connection() as conn:
            # Token rejected immediately
            self.assertIsNone(get_session(token, conn))


if __name__ == "__main__":
    unittest.main(verbosity=2)
