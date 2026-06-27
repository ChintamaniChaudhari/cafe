"""Kitchen WebSocket router — real-time KDS endpoint."""

import json
import logging

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.kitchen.manager import kitchen_manager
from app.modules.orders.repository import OrderRepository

logger = logging.getLogger(__name__)

router = APIRouter(tags=["kitchen"])


@router.websocket("/ws/kitchen")
async def kitchen_websocket(
    websocket: WebSocket,
) -> None:
    """
    WS /api/v1/ws/kitchen

    Kitchen Display System WebSocket endpoint.
    1. Accepts the connection and registers with the manager.
    2. Sends all active (non-SERVED) orders on connect (initial hydration).
    3. Keeps alive, receiving pings and forwarding order events via broadcast.
    """
    await kitchen_manager.connect(websocket)

    try:
        # Send initial active orders for hydration
        # (KDS clients connecting mid-shift need to see existing orders)
        # NOTE: We use a fresh DB session here since WS is long-lived
        from app.core.database import async_session_factory

        async with async_session_factory() as db:
            repo = OrderRepository(db)
            active_orders = await repo.get_active_orders()

            # Build order data for each active order using optimized helper
            from app.modules.orders.utils import build_order_event_payload
            orders_data = await build_order_event_payload(db, active_orders, "ORDER_CREATED")

            # Send initial hydration
            if orders_data:
                await websocket.send_text(
                    json.dumps({"event": "INITIAL_ORDERS", "orders": orders_data})
                )

        # Keep connection alive — listen for pings / client messages
        while True:
            data = await websocket.receive_text()
            # Client can send pings or status update requests
            logger.debug("Kitchen WS received: %s", data)

    except WebSocketDisconnect:
        kitchen_manager.disconnect(websocket)
    except Exception as e:
        logger.error("Kitchen WS error: %s", e)
        kitchen_manager.disconnect(websocket)
