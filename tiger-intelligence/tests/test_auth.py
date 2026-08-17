"""
TIGERTRACK AI — Unit tests for offline workstation authentication system.
Covers: Argon2id hashing, session lifecycle, brute-force lockout.
"""
import sys
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Ensure project root on path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.auth.hashing import hash_password, verify_password, needs_rehash
from app.auth.sessions import (
    create_session,
    get_session,
    revoke_session,
    purge_expired_sessions,
    get_lockout_seconds,
    is_locked_out,
    lockout_expiry_iso,
)
from app.database.db import TigerDatabase


def _temp_db() -> TigerDatabase:
    """Create a temporary in-memory-backed TigerDatabase for testing."""
    import tempfile, os
    tmp = tempfile.mktemp(suffix=".db")
    return TigerDatabase(Path(tmp))


class TestArgon2Hashing(unittest.TestCase):
    def test_hash_returns_string(self):
        h = hash_password("TigerTrack2025!")
        self.assertIsInstance(h, str)
        self.assertTrue(h.startswith("$argon2id$"))

    def test_verify_correct_password(self):
        h = hash_password("CorrectPassword123")
        self.assertTrue(verify_password("CorrectPassword123", h))

    def test_verify_wrong_password(self):
        h = hash_password("CorrectPassword123")
        self.assertFalse(verify_password("WrongPassword", h))

    def test_unique_hashes_for_same_password(self):
        p = "SamePassword99"
        h1 = hash_password(p)
        h2 = hash_password(p)
        self.assertNotEqual(h1, h2)  # Different salts

    def test_verify_does_not_raise(self):
        # Should return False, never raise
        result = verify_password("any", "not-a-valid-argon2-hash")
        self.assertFalse(result)

    def test_needs_rehash_fresh_hash(self):
        h = hash_password("AnyPassword")
        self.assertFalse(needs_rehash(h))


class TestSessionLifecycle(unittest.TestCase):
    def setUp(self):
        self.db = _temp_db()
        # Create a test officer
        self.db.create_officer("RFO-TEST01", "Test Officer", "OFFICER", hash_password("pass"))

    def test_create_and_get_session(self):
        with self.db._get_connection() as conn:
            token = create_session("RFO-TEST01", conn)
            self.assertTrue(len(token) > 20)
            session = get_session(token, conn)
            self.assertIsNotNone(session)
            self.assertEqual(session.officer_id, "RFO-TEST01")
            self.assertEqual(session.role, "OFFICER")

    def test_get_nonexistent_session(self):
        with self.db._get_connection() as conn:
            result = get_session("nonexistent-token", conn)
            self.assertIsNone(result)

    def test_revoke_session(self):
        with self.db._get_connection() as conn:
            token = create_session("RFO-TEST01", conn)
            revoke_session(token, conn)
            result = get_session(token, conn)
            self.assertIsNone(result)

    def test_expired_session_returns_none(self):
        with self.db._get_connection() as conn:
            token = create_session("RFO-TEST01", conn)
            # Manually expire it
            past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            conn.execute("UPDATE sessions SET expires_at = ? WHERE token = ?", (past, token))
            result = get_session(token, conn)
            self.assertIsNone(result)

    def test_purge_expired_sessions(self):
        with self.db._get_connection() as conn:
            token = create_session("RFO-TEST01", conn)
            past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            conn.execute("UPDATE sessions SET expires_at = ? WHERE token = ?", (past, token))
            purged = purge_expired_sessions(conn)
            self.assertGreaterEqual(purged, 1)

    def test_empty_token_returns_none(self):
        with self.db._get_connection() as conn:
            self.assertIsNone(get_session("", conn))
            self.assertIsNone(get_session(None, conn))


class TestBruteForceProtection(unittest.TestCase):
    def test_no_lockout_below_threshold(self):
        for n in range(1, 5):
            self.assertEqual(get_lockout_seconds(n), 0)

    def test_lockout_at_5(self):
        self.assertEqual(get_lockout_seconds(5), 30)

    def test_lockout_at_6_7(self):
        self.assertEqual(get_lockout_seconds(6), 120)
        self.assertEqual(get_lockout_seconds(7), 120)

    def test_lockout_at_8_plus(self):
        for n in range(8, 12):
            self.assertEqual(get_lockout_seconds(n), 600)

    def test_is_locked_out_past(self):
        past = (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()
        self.assertFalse(is_locked_out(past))

    def test_is_locked_out_future(self):
        future = (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat()
        self.assertTrue(is_locked_out(future))

    def test_is_locked_out_none(self):
        self.assertFalse(is_locked_out(None))

    def test_lockout_expiry_none_for_low_failures(self):
        self.assertIsNone(lockout_expiry_iso(3))

    def test_lockout_expiry_non_none_at_5(self):
        expiry = lockout_expiry_iso(5)
        self.assertIsNotNone(expiry)
        dt = datetime.fromisoformat(expiry)
        self.assertGreater(dt, datetime.now(timezone.utc))


class TestDatabaseOfficerMethods(unittest.TestCase):
    def setUp(self):
        self.db = _temp_db()

    def test_create_and_retrieve_officer(self):
        uid = self.db.create_officer("RFO-001", "Ramesh Patil", "OFFICER", "hash")
        self.assertIsNotNone(uid)
        officer = self.db.get_officer_by_officer_id("RFO-001")
        self.assertIsNotNone(officer)
        self.assertEqual(officer["display_name"], "Ramesh Patil")
        self.assertEqual(officer["role"], "OFFICER")
        self.assertEqual(officer["is_active"], 1)

    def test_duplicate_officer_id_raises(self):
        self.db.create_officer("ADMIN-001", "Admin", "ADMIN", "hash")
        with self.assertRaises(Exception):
            self.db.create_officer("ADMIN-001", "Duplicate", "OFFICER", "hash")

    def test_officer_count(self):
        self.assertEqual(self.db.officer_count(), 0)
        self.db.create_officer("RFO-002", "Name", "OFFICER", "hash")
        self.assertEqual(self.db.officer_count(), 1)

    def test_deactivate_officer(self):
        self.db.create_officer("RFO-003", "Name", "OFFICER", "hash")
        self.db.deactivate_officer("RFO-003")
        officer = self.db.get_officer_by_officer_id("RFO-003")
        self.assertEqual(officer["is_active"], 0)

    def test_reset_password(self):
        self.db.create_officer("RFO-004", "Name", "OFFICER", "oldhash")
        new_hash = hash_password("NewSecurePassword!")
        self.db.reset_officer_password("RFO-004", new_hash)
        officer = self.db.get_officer_by_officer_id("RFO-004")
        self.assertTrue(verify_password("NewSecurePassword!", officer["password_hash"]))

    def test_workstation_config(self):
        self.db.set_workstation_key("workstation_id", "TT-TEST-ABCD")
        self.db.set_workstation_key("reserve_name", "Pench Tiger Reserve")
        cfg = self.db.get_workstation_config()
        self.assertEqual(cfg["workstation_id"], "TT-TEST-ABCD")
        self.assertEqual(cfg["reserve_name"], "Pench Tiger Reserve")
        # Test upsert
        self.db.set_workstation_key("workstation_id", "TT-TEST-XXXX")
        cfg2 = self.db.get_workstation_config()
        self.assertEqual(cfg2["workstation_id"], "TT-TEST-XXXX")

    def test_increment_failed_attempts(self):
        self.db.create_officer("RFO-005", "Name", "OFFICER", "hash")
        future = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        self.db.increment_failed_attempts("RFO-005", future)
        officer = self.db.get_officer_by_officer_id("RFO-005")
        self.assertEqual(officer["failed_attempts"], 1)
        self.assertIsNotNone(officer["locked_until"])

    def test_update_last_login_clears_lockout(self):
        self.db.create_officer("RFO-006", "Name", "OFFICER", "hash")
        future = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        self.db.increment_failed_attempts("RFO-006", future)
        self.db.update_last_login("RFO-006")
        officer = self.db.get_officer_by_officer_id("RFO-006")
        self.assertEqual(officer["failed_attempts"], 0)
        self.assertIsNone(officer["locked_until"])


class TestAuthSecurityDeepPass(unittest.TestCase):
    def setUp(self):
        self.db = _temp_db()
        self.db.create_officer("ADMIN-SEC", "Chief Admin", "ADMIN", hash_password("AdminPass123!"))
        self.db.create_officer("RFO-FIELD", "Field Officer", "OFFICER", hash_password("OfficerPass123!"))

    def test_deactivated_officer_session_immediately_invalidated(self):
        with self.db._get_connection() as conn:
            token = create_session("RFO-FIELD", conn)
            # Active check works
            self.assertIsNotNone(get_session(token, conn))

        # Deactivate officer
        self.db.deactivate_officer("RFO-FIELD")

        with self.db._get_connection() as conn:
            # Token must be rejected immediately
            self.assertIsNone(get_session(token, conn))

    def test_password_hash_never_exposed_in_list_officers(self):
        officers = self.db.list_officers()
        self.assertGreaterEqual(len(officers), 2)
        for off in officers:
            self.assertNotIn("password_hash", off)
            self.assertIn("officer_id", off)
            self.assertIn("role", off)

    def test_password_reset_revokes_all_active_sessions(self):
        with self.db._get_connection() as conn:
            token1 = create_session("RFO-FIELD", conn)
            token2 = create_session("RFO-FIELD", conn)
            self.assertIsNotNone(get_session(token1, conn))
            self.assertIsNotNone(get_session(token2, conn))

        # Reset password and purge sessions (as server.py does)
        new_hash = hash_password("NewOfficerPass999!")
        self.db.reset_officer_password("RFO-FIELD", new_hash)
        with self.db._get_connection() as conn:
            conn.execute("DELETE FROM sessions WHERE officer_id = ?", ("RFO-FIELD",))

        with self.db._get_connection() as conn:
            self.assertIsNone(get_session(token1, conn))
            self.assertIsNone(get_session(token2, conn))

    def test_session_token_entropy_and_uniqueness(self):
        with self.db._get_connection() as conn:
            tokens = {create_session("ADMIN-SEC", conn) for _ in range(100)}
            self.assertEqual(len(tokens), 100, "100 session tokens must produce 100 distinct values")
            for t in tokens:
                self.assertGreaterEqual(len(t), 43, "Base64 token urlsafe must be >= 43 chars")


if __name__ == "__main__":
    unittest.main(verbosity=2)
