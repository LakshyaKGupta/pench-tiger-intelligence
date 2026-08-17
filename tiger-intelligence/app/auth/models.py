"""
TIGERTRACK AI — Auth Pydantic models
All request/response shapes for the offline authentication system.
"""
from typing import Optional
from pydantic import BaseModel, Field


class WorkstationSetupRequest(BaseModel):
    officer_id: str = Field(..., description="e.g. ADMIN-001 or RFO-PATIL")
    display_name: str = Field(..., description="Full name shown in UI")
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    reserve_name: Optional[str] = Field("Pench Tiger Reserve")


class LoginRequest(BaseModel):
    officer_id: str
    password: str


class CreateOfficerRequest(BaseModel):
    officer_id: str = Field(..., description="e.g. RFO-PATIL")
    display_name: str
    password: str = Field(..., min_length=8)
    role: str = Field("OFFICER", description="ADMIN | OFFICER | SUPERVISOR")


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)


class LoginResponse(BaseModel):
    session_token: str
    officer_id: str
    display_name: str
    role: str
    expires_at: str
    workstation_id: Optional[str] = None


class SessionInfo(BaseModel):
    user_id: str
    officer_id: str
    display_name: str
    role: str

    @property
    def is_admin(self) -> bool:
        return self.role in ("ADMIN", "SUPERVISOR")


class WorkstationStatus(BaseModel):
    configured: bool
    officer_count: int
    workstation_id: Optional[str]
    reserve_name: Optional[str]
