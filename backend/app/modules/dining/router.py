"""Dining router — QR scan endpoint."""

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import set_session_cookie
from app.modules.dining.service import DiningService

router = APIRouter(prefix="/s", tags=["dining"])


@router.get("/{shortcode}")
async def scan_qr(
    shortcode: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    QR Scan endpoint.

    GET /api/v1/s/{shortcode}

    1. Validates the shortcode and finds the table.
    2. Creates or reuses an ACTIVE dining session.
    3. Sets the cafeos_session HTTP-only cookie.
    4. Returns tenant + table + session payload.
    """
    service = DiningService(db)
    result = await service.get_or_create_session(shortcode)

    # Set HTTP-only session cookie
    session_id = result["data"]["session"]["id"]
    set_session_cookie(response, session_id)

    return result
