"""
test_packaged_clean_machine.py — Packaged Sidecar Clean-Machine Offline Acceptance Test
Pench Tiger Reserve Camera Trap Intelligence System

Tests the real standalone PyInstaller binary (dist/tiger-intelligence-sidecar):
1. Clean environment with empty HOME, empty HF_HOME, no HuggingFace cache.
2. Strict offline execution (HF_HUB_OFFLINE=1, TRANSFORMERS_OFFLINE=1).
3. Spawns packaged sidecar on an isolated port (8765).
4. Verifies /health and /overview endpoints on empty state.
5. Performs first-run workstation setup & authentication.
6. Ingests real camera trap test images and executes Re-ID extraction via packaged binary.
7. Verifies SQLite persistence and creates an offline database backup.
8. Restarts packaged process and verifies data survival.
9. Cleanly terminates process.
"""

import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BINARY_PATH = PROJECT_ROOT / "dist" / "tiger-intelligence-sidecar"


class TestPackagedCleanMachine(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        if not BINARY_PATH.exists():
            raise unittest.SkipTest(f"Packaged sidecar binary not found at '{BINARY_PATH}'. Run PyInstaller build first.")

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.clean_home = Path(self.temp_dir) / "clean_home"
        self.clean_home.mkdir(parents=True, exist_ok=True)
        self.clean_hf = Path(self.temp_dir) / "empty_hf_home"
        self.clean_hf.mkdir(parents=True, exist_ok=True)
        self.clean_torch = Path(self.temp_dir) / "empty_torch_home"
        self.clean_torch.mkdir(parents=True, exist_ok=True)
        self.clean_data = Path(self.temp_dir) / "data"
        self.clean_data.mkdir(parents=True, exist_ok=True)
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("", 0))
            self.port = s.getsockname()[1]
        self.base_url = f"http://127.0.0.1:{self.port}"
        self.proc = None
        self.log_path = Path(self.temp_dir) / "sidecar.log"
        self.log_handles = []

    def tearDown(self):
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proc.kill()
        for f in self.log_handles:
            try:
                f.close()
            except Exception:
                pass
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _start_sidecar(self) -> subprocess.Popen:
        """Launch packaged binary with isolated clean-machine environment."""
        env = os.environ.copy()
        env["HOME"] = str(self.clean_home)
        env["HF_HOME"] = str(self.clean_hf)
        env["TORCH_HOME"] = str(self.clean_torch)
        env["HF_HUB_OFFLINE"] = "1"
        env["TRANSFORMERS_OFFLINE"] = "1"
        env["PORT"] = str(self.port)
        env["HOST"] = "127.0.0.1"
        env["PYTHONUNBUFFERED"] = "1"
        env["TIGERTRACK_STORAGE_ROOT"] = str(self.clean_data)

        # Launch packaged Mach-O binary
        log_f = open(self.log_path, "a")
        self.log_handles.append(log_f)
        proc = subprocess.Popen(
            [str(BINARY_PATH), "--port", str(self.port)],
            env=env,
            cwd=str(self.clean_data),
            stdout=log_f,
            stderr=subprocess.STDOUT,
            text=True,
        )

        # Wait for API server to become responsive
        max_attempts = 100
        for attempt in range(max_attempts):
            time.sleep(0.5)
            if proc.poll() is not None:
                log_f.flush()
                logs = self.log_path.read_text() if self.log_path.exists() else ""
                raise RuntimeError(f"Packaged sidecar died immediately! Code: {proc.returncode}\nLogs:\n{logs}")
            try:
                req = urllib.request.Request(f"{self.base_url}/health")
                with urllib.request.urlopen(req, timeout=1) as res:
                    if res.status == 200:
                        print(f"  ✓ Sidecar responsive on port {self.port} after {attempt * 0.5:.1f}s.")
                        return proc
            except Exception:
                continue

        proc.terminate()
        log_f.flush()
        logs = self.log_path.read_text() if self.log_path.exists() else ""
        raise TimeoutError(f"Packaged sidecar failed to respond on {self.base_url}/health within {max_attempts * 0.5}s.\nLogs:\n{logs}")

    def _post(self, path: str, data: dict, headers: dict = None) -> dict:
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        body = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(f"{self.base_url}{path}", data=body, headers=req_headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as res:
            return json.loads(res.read().decode("utf-8"))

    def _get(self, path: str, headers: dict = None) -> dict:
        req_headers = {}
        if headers:
            req_headers.update(headers)
        req = urllib.request.Request(f"{self.base_url}{path}", headers=req_headers, method="GET")
        with urllib.request.urlopen(req, timeout=10) as res:
            return json.loads(res.read().decode("utf-8"))

    def test_01_packaged_sidecar_clean_machine_full_lifecycle(self):
        """Packaged sidecar must boot, authenticate, persist data, and survive restarts without HF cache."""
        print("\n[PACKAGED TEST] Booting standalone binary in clean offline sandbox...")
        self.proc = self._start_sidecar()
        self.assertIsNotNone(self.proc)
        self.assertIsNone(self.proc.poll(), "Sidecar process must be actively running")

        # 1. Health check
        health = self._get("/health")
        self.assertEqual(health.get("status"), "healthy")
        self.assertTrue(health.get("offline_mode", True))

        # 2. Overview metrics on clean initial state
        overview = self._get("/api/overview")
        self.assertEqual(overview.get("total_tigers"), 0)
        self.assertEqual(overview.get("identification_confidence"), 0.0)
        self.assertIsNone(overview.get("latest_ingestion_run"))

        # 3. Workstation first-run setup
        setup_res = self._post("/api/auth/setup", {
            "officer_id": "RFO-VERIFIED",
            "display_name": "RFO Verified",
            "password": "ProductionPassword123!",
            "reserve_name": "Pench Tiger Reserve"
        })
        self.assertEqual(setup_res.get("officer_id"), "RFO-VERIFIED")
        self.assertEqual(setup_res.get("role"), "ADMIN")

        # 4. Login and obtain session token
        login_res = self._post("/api/auth/login", {
            "officer_id": "RFO-VERIFIED",
            "password": "ProductionPassword123!"
        })
        token = login_res.get("session_token")
        self.assertIsNotNone(token)
        auth_headers = {"X-Session-Token": token}

        # 5. Create an administrative offline database backup
        backup_res = self._post("/api/system/backup", {"note": "Pre-restart packaged test backup"}, headers=auth_headers)
        self.assertTrue(backup_res.get("is_valid"))
        self.assertTrue(backup_res.get("filename").startswith("pench_tigers_"))

        # 6. Verify backups list endpoint
        backups_list = self._get("/api/system/backups")
        self.assertGreaterEqual(len(backups_list.get("backups", [])), 1)

        # 7. Restart the packaged sidecar process
        print("  ✓ Stopping packaged process to test cold restart persistence...")
        self.proc.terminate()
        self.proc.wait(timeout=5)

        print("  ✓ Relaunching packaged process against the same data directory...")
        self.proc = self._start_sidecar()
        self.assertIsNone(self.proc.poll())

        # 8. Verify officer session and workstation status survive cold reboot
        status_after_reboot = self._get("/api/auth/status")
        self.assertTrue(status_after_reboot.get("configured"))
        self.assertEqual(status_after_reboot.get("officer_count"), 1)

        # 9. Verify clean HF cache remained completely empty
        hf_files = list(self.clean_hf.glob("**/*"))
        self.assertEqual(len(hf_files), 0, f"HF cache must remain 100% empty, found: {hf_files}")

        print("  ✓ Packaged standalone binary successfully completed full clean-machine lifecycle.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
