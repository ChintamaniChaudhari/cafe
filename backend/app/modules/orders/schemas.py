"""Order schemas — request/response models for the orders API."""

import uuid

from pydantic import BaseModel, Field


# ── Request Schemas ───────────────────────────────────────────
class OrderItemRequest(BaseModel):
    """A single item in an order creation request."""

    item_id: uuid.UUID
    quantity: int = Field(ge=1)
    notes: str | None = None


class CreateOrderRequest(BaseModel):
    """Request body for POST /api/v1/orders."""

    items: list[OrderItemRequest] = Field(min_length=1)


class UpdateOrderStatusRequest(BaseModel):
    """Request body for PATCH /api/v1/orders/{id}/status."""

    status: str = Field(description="Target status: PREPARING, READY, or SERVED")


# ── Response Schemas ──────────────────────────────────────────
class OrderItemResponse(BaseModel):
    """A single item in an order response."""

    id: str
    item_id: str
    name: str
    quantity: int
    unit_price: float
    item_notes: str | None = None


class OrderResponse(BaseModel):
    """Full order response."""

    id: str
    order_number: int
    status: str
    total_amount: float
    items: list[OrderItemResponse]
    table_label: str
    created_at: str
