"""
TIGERTRACK AI — Session lifecycle management
Cryptographically-random session tokens stored in local SQLite.
Sessions expire after SESSION_TTL_HOURS. Brute-force lockout is enforced here.
"""
import secrets
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.auth.models import SessionInfo

SESSION_TTL_HOURS = 8
# Lockout schedule: {failed_attempt_count: lock_seconds}
LOCKOUT_SCHEDULE = {
    5: 30,
    6: 120,
    7: 120,
}
LOCKOUT_DEFAULT_SECONDS = 600  # 10 min for 8+ failures


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def create_session(officer_id: str, conn: sqlite3.Connection) -> str:
    """
    Generate a cryptographically-random session token, persist to sessions table,
    and return the token string. Old expired sessions for this officer are cleaned up.
    """
    token = secrets.token_urlsafe(32)
    expires_at = _iso(_now_utc() + timedelta(hours=SESSION_TTL_HOURS))
    conn.execute(
        "INSERT INTO sessions (token, officer_id, expires_at) VALUES (?, ?, ?)",
        (token, officer_id, expires_at),
    )
    # Opportunistically purge expired tokens for this officer
    conn.execute(
        "DELETE FROM sessions WHERE officer_id = ? AND expires_at < ?",
        (officer_id, _iso(_now_utc())),
    )
    return token


def get_session(token: str, conn: sqlite3.Connection) -> Optional[SessionInfo]:
    """
    Validate a session token. Returns SessionInfo if token exists and is not expired.
    Returns None otherwise (expired, missing, or revoked).
    """
    if not token:
        return None
    row = conn.execute(
        """
        SELECT s.token, s.expires_at, o.id, o.officer_id, o.display_name, o.role, o.is_active
        FROM sessions s
        JOIN officers o ON s.officer_id = o.officer_id
        WHERE s.token = ?
        """,
        (token,),
    ).fetchone()
    if row is None:
        return None
    if row["is_active"] == 0:
        return None
    expires_at = datetime.fromisoformat(row["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if _now_utc() > expires_at:
        # Expired — clean up
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        return None
    return SessionInfo(
        user_id=row["id"],
        officer_id=row["officer_id"],
        display_name=row["display_name"],
        role=row["role"],
    )


def revoke_session(token: str, conn: sqlite3.Connection) -> None:
    """Immediately revoke a session token (logout)."""
    conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def purge_expired_sessions(conn: sqlite3.Connection) -> int:
    """Remove all expired session rows. Called on server startup."""
    cur = conn.execute(
        "DELETE FROM sessions WHERE expires_at < ?", (_iso(_now_utc()),)
    )
    return cur.rowcount


def get_lockout_seconds(failed_attempts: int) -> int:
    """Return the number of seconds to lock an account given failed attempt count."""
    if failed_attempts < 5:
        return 0
    return LOCKOUT_SCHEDULE.get(failed_attempts, LOCKOUT_DEFAULT_SECONDS)


def is_locked_out(locked_until_iso: Optional[str]) -> bool:
    """Return True if the officer's account is currently locked."""
    if not locked_until_iso:
        return False
    try:
        locked_until = datetime.fromisoformat(locked_until_iso)
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        return _now_utc() < locked_until
    except ValueError:
        return False


def lockout_expiry_iso(failed_attempts: int) -> Optional[str]:
    """Return ISO8601 expiry for a lockout based on current failed attempt count."""
    seconds = get_lockout_seconds(failed_attempts)
    if seconds == 0:
        return None
    return _iso(_now_utc() + timedelta(seconds=seconds))
