"""Orders service — business logic for order creation and status transitions."""

import logging
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import EventType, event_bus
from app.models.order import OrderStatus, validate_transition, InvalidTransitionError
from app.modules.menu.service import MenuService
from app.modules.orders.repository import OrderRepository
from app.modules.orders.schemas import CreateOrderRequest

logger = logging.getLogger(__name__)


class OrderService:
    """Handles order creation (with price snapshots) and status transitions."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = OrderRepository(db)
        self.menu_service = MenuService(db)  # No-Join Rule: call menu service for prices

    async def create_order(
        self, session_id: uuid.UUID, request: CreateOrderRequest
    ) -> dict:
        """
        Create a new order.

        1. Snapshot prices from the menu engine (No-Join Rule).
        2. Compute total server-side (never trust frontend).
        3. Create Order + OrderItems.
        4. Publish ORDER_CREATED event for KDS broadcast.
        """
        # 1. Snapshot prices and validate items
        items_with_prices = []
        total = 0.0

        for item_req in request.items:
            price = await self.menu_service.get_item_price(item_req.item_id)
            if price is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Menu item {item_req.item_id} is not available.",
                )

            line_total = price * item_req.quantity
            total += line_total

            items_with_prices.append(
                {
                    "item_id": item_req.item_id,
                    "quantity": item_req.quantity,
                    "unit_price": price,
                    "notes": item_req.notes,
                }
            )

        # 2. Get next order number
        order_number = await self.repo.get_next_order_number(session_id)

        # 3. Create order
        order = await self.repo.create_order(
            session_id=session_id,
            order_number=order_number,
            total_amount=total,
            items=items_with_prices,
        )

        # 4. Fetch related data for the event payload
        from app.models.dining_session import DiningSession
        from app.models.table import DiningTable
        from sqlalchemy import select

        session_result = await self.db.execute(
            select(DiningSession).where(DiningSession.id == session_id)
        )
        dining_session = session_result.scalar_one_or_none()

        table_label = "Unknown"
        if dining_session:
            table_result = await self.db.execute(
                select(DiningTable).where(DiningTable.id == dining_session.table_id)
            )
            table = table_result.scalar_one_or_none()
            if table:
                table_label = table.label

        # Build item names for the event
        item_names = []
        for item_data in items_with_prices:
            from app.models.menu import MenuItem

            item_result = await self.db.execute(
                select(MenuItem).where(MenuItem.id == item_data["item_id"])
            )
            menu_item = item_result.scalar_one_or_none()
            item_names.append(
                {
                    "name": menu_item.name if menu_item else "Unknown",
                    "quantity": item_data["quantity"],
                    "notes": item_data["notes"],
                }
            )

        # 5. Publish ORDER_CREATED event
        event_data = {
            "event": EventType.ORDER_CREATED.value,
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
        await event_bus.publish(EventType.ORDER_CREATED, event_data)

        logger.info(
            "Order #%d created for table %s (total: %.2f)",
            order.order_number,
            table_label,
            total,
        )

        return event_data

    async def update_order_status(
        self, order_id: uuid.UUID, new_status_str: str
    ) -> dict:
        """
        Transition an order to a new status.

        Validates the state machine, updates the DB, and publishes
        ORDER_STATUS_CHANGED for WS broadcast.
        """
        # Parse target status
        try:
            new_status = OrderStatus(new_status_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {new_status_str}",
            )

        # Fetch current order
        order = await self.repo.get_order_by_id(order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found.",
            )

        # Validate state transition
        try:
            validate_transition(order.status, new_status)
        except InvalidTransitionError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

        # Update
        updated = await self.repo.update_status(order_id, new_status)

        # Fetch table label for the event
        from app.models.dining_session import DiningSession
        from app.models.table import DiningTable
        from sqlalchemy import select

        session_result = await self.db.execute(
            select(DiningSession).where(DiningSession.id == order.session_id)
        )
        dining_session = session_result.scalar_one_or_none()
        table_label = "Unknown"
        if dining_session:
            table_result = await self.db.execute(
                select(DiningTable).where(DiningTable.id == dining_session.table_id)
            )
            table = table_result.scalar_one_or_none()
            if table:
                table_label = table.label

        # Publish event
        event_data = {
            "event": EventType.ORDER_STATUS_CHANGED.value,
            "data": {
                "order_id": str(order_id),
                "order_number": updated.order_number if updated else 0,
                "table_label": table_label,
                "status": new_status.value,
                "previous_status": order.status.value if order else "UNKNOWN",
            },
        }
        await event_bus.publish(EventType.ORDER_STATUS_CHANGED, event_data)

        logger.info(
            "Order %s transitioned to %s",
            order_id,
            new_status.value,
        )

        return event_data
