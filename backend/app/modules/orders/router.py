"""Orders router — order creation and status update endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_session_id
from app.core.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.modules.orders.schemas import CreateOrderRequest, UpdateOrderStatusRequest
from app.modules.orders.service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_order(
    body: CreateOrderRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    POST /api/v1/orders

    Creates a new order for the customer's active dining session.
    Session ID is read from the cafeos_session HTTP-only cookie.
    Pricing is computed server-side (never trust frontend).
    """
    session_id_str = get_session_id(request)
    if not session_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active session. Please scan a QR code first.",
        )

    try:
        session_id = uuid.UUID(session_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session cookie.",
        )

    service = OrderService(db)
    return await service.create_order(session_id, body)


@router.get("/session")
async def get_session_orders(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    GET /api/v1/orders/session

    Returns all orders for the customer's active dining session.
    """
    session_id_str = get_session_id(request)
    if not session_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active session. Please scan a QR code first.",
        )

    try:
        session_id = uuid.UUID(session_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session cookie.",
        )

    service = OrderService(db)
    return await service.get_session_orders(session_id)


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: uuid.UUID,
    body: UpdateOrderStatusRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.KITCHEN])),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    PATCH /api/v1/orders/{id}/status

    Advances the order through the state machine:
    RECEIVED → PREPARING → READY → SERVED

    Invalid transitions return 400.
    Publishes ORDER_STATUS_CHANGED event for WS broadcast.
    """
    service = OrderService(db)
    return await service.update_order_status(order_id, body.status)
