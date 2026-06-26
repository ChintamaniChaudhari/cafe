"""Menu repository — database access for categories and items."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.menu import MenuCategory, MenuItem


class MenuRepository:
    """Data access layer for menu categories and items."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_categories_by_tenant(
        self, tenant_id: uuid.UUID
    ) -> list[MenuCategory]:
        """Fetch all categories for a tenant, ordered by sort_order."""
        stmt = (
            select(MenuCategory)
            .where(MenuCategory.tenant_id == tenant_id)
            .order_by(MenuCategory.sort_order)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_available_items_by_category(
        self, category_id: uuid.UUID
    ) -> list[MenuItem]:
        """Fetch available (non-deleted) items for a category."""
        stmt = (
            select(MenuItem)
            .where(MenuItem.category_id == category_id)
            .where(MenuItem.is_available == True)  # noqa: E712
            .where(MenuItem.is_deleted == False)  # noqa: E712
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_item_by_id(self, item_id: uuid.UUID) -> MenuItem | None:
        """Fetch a single menu item by ID."""
        stmt = select(MenuItem).where(MenuItem.id == item_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
