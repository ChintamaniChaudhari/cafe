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

            # Build order data for each active order
            from sqlalchemy import select
            from app.models.dining_session import DiningSession
            from app.models.table import DiningTable
            from app.models.order import OrderItem
            from app.models.menu import MenuItem

            orders_data = []
            for order in active_orders:
                # Get table label
                session_result = await db.execute(
                    select(DiningSession).where(DiningSession.id == order.session_id)
                )
                dining_session = session_result.scalar_one_or_none()
                table_label = "Unknown"
                if dining_session:
                    table_result = await db.execute(
                        select(DiningTable).where(
                            DiningTable.id == dining_session.table_id
                        )
                    )
                    table = table_result.scalar_one_or_none()
                    if table:
                        table_label = table.label

                # Get order items with names
                items_result = await db.execute(
                    select(OrderItem).where(OrderItem.order_id == order.id)
                )
                order_items = items_result.scalars().all()

                item_names = []
                for oi in order_items:
                    mi_result = await db.execute(
                        select(MenuItem).where(MenuItem.id == oi.item_id)
                    )
                    menu_item = mi_result.scalar_one_or_none()
                    item_names.append(
                        {
                            "name": menu_item.name if menu_item else "Unknown",
                            "quantity": oi.quantity,
                            "notes": oi.item_notes,
                        }
                    )

                orders_data.append(
                    {
                        "event": "ORDER_CREATED",
                        "data": {
                            "order_id": str(order.id),
                            "order_number": order.order_number,
                            "table_label": table_label,
                            "status": order.status.value,
                            "total_amount": float(order.total_amount),
                            "items": item_names,
                            "created_at": order.created_at.isoformat(),
                        },
                    }
                )

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
