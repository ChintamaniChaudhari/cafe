"""Orders repository — database access for orders and order items."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderItem, OrderStatus


class OrderRepository:
    """Data access layer for orders and order items."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_next_order_number(self, session_id: uuid.UUID) -> int:
        """Get the next order number for a session (auto-increment)."""
        stmt = (
            select(func.coalesce(func.max(Order.order_number), 0))
            .where(Order.session_id == session_id)
        )
        result = await self.db.execute(stmt)
        current_max = result.scalar_one()
        return current_max + 1

    async def get_orders_for_session(self, session_id: uuid.UUID) -> list[Order]:
        from sqlalchemy.orm import selectinload
        from app.models.order import OrderItem
        stmt = (
            select(Order)
            .where(Order.session_id == session_id)
            .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
            .order_by(Order.created_at.desc())
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def create_order(
        self,
        session_id: uuid.UUID,
        order_number: int,
        subtotal: float,
        tax_amount: float,
        discount_amount: float,
        total_amount: float,
        items: list[dict],
    ) -> Order:
        """Create an order with its line items in a single transaction."""
        order = Order(
            session_id=session_id,
            order_number=order_number,
            subtotal=subtotal,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            total_amount=total_amount,
        )
        self.db.add(order)
        await self.db.flush()  # Get the order.id

        for item_data in items:
            order_item = OrderItem(
                order_id=order.id,
                item_id=item_data["item_id"],
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                item_notes=item_data.get("notes"),
                selected_modifiers=item_data.get("selected_modifiers", []),
            )
            self.db.add(order_item)

        await self.db.flush()
        return order

    async def get_order_by_id(self, order_id: uuid.UUID) -> Order | None:
        """Fetch a single order by ID."""
        stmt = select(Order).where(Order.id == order_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_order_items(self, order_id: uuid.UUID) -> list[OrderItem]:
        """Fetch all line items for an order."""
        stmt = select(OrderItem).where(OrderItem.order_id == order_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_status(
        self, order_id: uuid.UUID, new_status: OrderStatus
    ) -> Order | None:
        """Update the status of an order. Returns updated order or None."""
        order = await self.get_order_by_id(order_id)
        if order:
            order.status = new_status
            self.db.add(order)
            await self.db.flush()
        return order

    async def get_active_orders(self) -> list[Order]:
        """Fetch all non-SERVED and non-CANCELED orders (for kitchen display on connect)."""
        stmt = (
            select(Order)
            .where(~Order.status.in_([OrderStatus.SERVED, OrderStatus.CANCELED]))
            .order_by(Order.created_at)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
