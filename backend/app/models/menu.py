"""Menu entities — categories and items."""

import uuid
from decimal import Decimal

from sqlmodel import Field, SQLModel


class MenuCategory(SQLModel, table=True):
    """A menu category (e.g. Beverages, Appetizers)."""

    __tablename__ = "menu_categories"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenants.id", index=True)
    name: str = Field(max_length=64)
    sort_order: int = Field(default=0)


class MenuItem(SQLModel, table=True):
    """
    A menu item belonging to a category.

    base_price is the source of truth for pricing.
    When an order is placed, base_price is snapshotted into order_items.unit_price.
    """

    __tablename__ = "menu_items"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    category_id: uuid.UUID = Field(foreign_key="menu_categories.id", index=True)
    name: str = Field(max_length=128)
    description: str | None = Field(default=None, max_length=512)
    base_price: Decimal = Field(max_digits=10, decimal_places=2)
    is_available: bool = Field(default=True)
    is_deleted: bool = Field(default=False)  # Soft delete
    image_url: str | None = Field(default=None)
