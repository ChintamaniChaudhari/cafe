"""Auth router — staff JWT login (skeleton for Phase 1)."""

from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login() -> dict:
    """
    POST /api/v1/auth/login

    Staff login endpoint. Returns a JWT token.
    Skeleton — full implementation comes after Phase 1 Gatekeeper demo.
    """
    return {"detail": "Auth login not yet implemented. Phase 1 focuses on the ordering pipeline."}
