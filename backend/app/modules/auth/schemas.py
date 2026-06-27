"""Auth schemas — models for login."""

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Request body for staff login."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response containing JWT token."""
    access_token: str
    token_type: str = "bearer"
    user: dict
