"""
TIGERTRACK AI — FastAPI auth middleware / dependency injection
Reads session token from X-Session-Token header.
Provides get_current_session and require_admin FastAPI dependencies.
"""
from fastapi import Depends, Header, HTTPException, status, Request
from typing import Optional

from app.auth.models import SessionInfo
from app.auth.sessions import get_session


def get_current_session(
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    request: Request = None,
) -> SessionInfo:
    """
    FastAPI dependency: validate session token from X-Session-Token header.
    Raises 401 if missing or invalid. Raises 403 if officer is deactivated.
    The database connection is obtained from the app state (set during startup).
    """
    if not x_session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to TIGERTRACK.",
            headers={"WWW-Authenticate": "X-Session-Token"},
        )
    # Access the shared db from app state
    db = request.app.state.db
    with db._get_connection() as conn:
        session = get_session(x_session_token, conn)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please sign in again.",
            headers={"WWW-Authenticate": "X-Session-Token"},
        )
    return session


def require_admin(session: SessionInfo = Depends(get_current_session)) -> SessionInfo:
    """
    FastAPI dependency: require the authenticated officer to have ADMIN or SUPERVISOR role.
    Raises 403 if the role is insufficient.
    """
    if not session.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. {session.officer_id} ({session.role}) does not have administrative privileges.",
        )
    return session
