"""Dining router — QR scan endpoint."""

from fastapi import APIRouter, Depends, Response, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid

from app.core.database import get_db
from app.core.security import set_session_cookie, get_session_id
from app.modules.dining.service import DiningService
from app.models.dining_session import DiningSession, SessionStatus
from app.models.feedback import Feedback
from pydantic import BaseModel, Field

class FeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = None

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


@router.post("/checkout")
async def request_checkout(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Customer requests the bill.
    Transitions session from ACTIVE to PAYMENT_PENDING.
    """
    session_id_str = get_session_id(request)
    if not session_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active session found.",
        )

    try:
        session_id = uuid.UUID(session_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    stmt = select(DiningSession).where(DiningSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if not session or session.status != SessionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not active or cannot be checked out.",
        )

    session.status = SessionStatus.PAYMENT_PENDING
    db.add(session)
    await db.commit()

    return {"status": "success", "message": "Checkout requested."}


@router.post("/feedback", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    body: FeedbackCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Submit customer feedback for a session."""
    session_id_str = get_session_id(request)
    if not session_id_str:
        raise HTTPException(status_code=401, detail="No active session found.")

    try:
        session_id = uuid.UUID(session_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    from app.models.table import DiningTable
    stmt = (
        select(DiningSession, DiningTable)
        .join(DiningTable, DiningSession.table_id == DiningTable.id)
        .where(DiningSession.id == session_id)
    )
    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    session, table = row

    feedback = Feedback(
        tenant_id=table.tenant_id,
        session_id=session.id,
        rating=body.rating,
        comment=body.comment
    )
    db.add(feedback)
    await db.commit()

    return {"status": "success", "message": "Feedback submitted."}
