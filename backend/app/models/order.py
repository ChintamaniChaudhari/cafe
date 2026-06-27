"""Order entities — orders and order items with state machine."""

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlmodel import Field, SQLModel, Column, JSON


class OrderStatus(str, enum.Enum):
    """Order lifecycle states. Transitions are strictly enforced."""

    RECEIVED = "RECEIVED"
    PREPARING = "PREPARING"
    READY = "READY"
    SERVED = "SERVED"
    CANCELED = "CANCELED"


# ── Valid State Transitions ───────────────────────────────────
_VALID_TRANSITIONS: dict[OrderStatus, list[OrderStatus]] = {
    OrderStatus.RECEIVED: [OrderStatus.PREPARING, OrderStatus.CANCELED],
    OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.CANCELED],
    OrderStatus.READY: [OrderStatus.SERVED, OrderStatus.CANCELED],
    OrderStatus.SERVED: [],  # Terminal state
    OrderStatus.CANCELED: [], # Terminal state
}


class InvalidTransitionError(Exception):
    """Raised when an invalid order state transition is attempted."""

    def __init__(self, current: OrderStatus, target: OrderStatus) -> None:
        self.current = current
        self.target = target
        super().__init__(
            f"Invalid order transition: {current.value} → {target.value}"
        )


def validate_transition(current: OrderStatus, target: OrderStatus) -> None:
    """
    Validate that a state transition is permitted.

    Raises InvalidTransitionError if the transition is not in the allowed map.
    """
    allowed = _VALID_TRANSITIONS.get(current, [])
    if target not in allowed:
        raise InvalidTransitionError(current, target)


class Order(SQLModel, table=True):
    """
    A customer order tied to a dining session.

    total_amount is computed server-side from snapshotted unit prices.
    order_number is auto-incremented per session for human readability.
    """

    __tablename__ = "orders"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    session_id: uuid.UUID = Field(foreign_key="dining_sessions.id", index=True)
    order_number: int
    status: OrderStatus = Field(default=OrderStatus.RECEIVED)
    subtotal: Decimal = Field(default=0, max_digits=10, decimal_places=2)
    tax_amount: Decimal = Field(default=0, max_digits=10, decimal_places=2)
    discount_amount: Decimal = Field(default=0, max_digits=10, decimal_places=2)
    total_amount: Decimal = Field(max_digits=10, decimal_places=2)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderItem(SQLModel, table=True):
    """
    A line item within an order.

    unit_price is snapshotted from MenuItem.base_price at order creation time.
    The frontend price is NEVER trusted (backend computes all pricing).
    """

    __tablename__ = "order_items"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    order_id: uuid.UUID = Field(foreign_key="orders.id", index=True)
    item_id: uuid.UUID = Field(foreign_key="menu_items.id")
    quantity: int = Field(ge=1)
    unit_price: Decimal = Field(max_digits=10, decimal_places=2)
    item_notes: str | None = Field(default=None, max_length=256)
    selected_modifiers: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
