"""
CafeOS security utilities.

- Argon2 password hashing (staff)
- JWT token creation / decoding (staff auth)
- HTTP-only session cookie helpers (customer sessions)
"""

from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Request, Response
from jose import JWTError, jwt

from app.core.config import settings

# ── Password Hashing (Argon2) ────────────────────────────────
_ph = PasswordHasher()


def hash_password(plain: str) -> str:
    """Hash a plaintext password using Argon2."""
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against an Argon2 hash."""
    try:
        return _ph.verify(hashed, plain)
    except VerifyMismatchError:
        return False


# ── JWT Tokens (Staff Auth) ──────────────────────────────────
def create_jwt_token(data: dict, expires_minutes: int | None = None) -> str:
    """Create a signed JWT token for staff authentication."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.JWT_EXPIRATION_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_jwt_token(token: str) -> dict | None:
    """Decode and validate a JWT token. Returns None on failure."""
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        return None


# ── Session Cookie (Customer Sessions) ───────────────────────
def set_session_cookie(response: Response, session_id: str) -> None:
    """Set the cafeos_session HTTP-only cookie on the response."""
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        secure=False,  # Set True in production (HTTPS)
        samesite="lax",
        max_age=settings.SESSION_COOKIE_MAX_AGE,
        path="/",
    )


def get_session_id(request: Request) -> str | None:
    """Extract the session ID from the cafeos_session cookie."""
    return request.cookies.get(settings.SESSION_COOKIE_NAME)
