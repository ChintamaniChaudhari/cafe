"""Menu service — business logic for menu retrieval."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.menu.repository import MenuRepository


class MenuService:
    """Handles menu data retrieval for the customer portal."""

    def __init__(self, db: AsyncSession) -> None:
        self.repo = MenuRepository(db)

    async def get_full_menu(self, tenant_id: str | None = None) -> dict:
        """
        Build the full menu response with categories and nested items.

        If tenant_id is None, resolves to the first available tenant (MVP single-tenant mode).
        Returns the structure: { "categories": [{ "id", "name", "items": [...] }] }
        """
        tid = await self.repo.resolve_tenant_id(tenant_id)
        if tid is None:
            return {"categories": []}

        categories = await self.repo.get_categories_by_tenant(tid)

        result = []
        for cat in categories:
            items = await self.repo.get_available_items_by_category(cat.id)
            result.append(
                {
                    "id": str(cat.id),
                    "name": cat.name,
                    "items": [
                        {
                            "id": str(item.id),
                            "name": item.name,
                            "description": item.description,
                            "price": float(item.base_price),
                            "is_available": item.is_available,
                            "image_url": item.image_url,
                            "modifiers": item.modifiers or [],
                        }
                        for item in items
                    ],
                }
            )

        return {"categories": result}

    async def get_item(self, item_id: uuid.UUID):
        """
        Get the menu item by ID.
        """
        item = await self.repo.get_item_by_id(item_id)
        if item and item.is_available and not item.is_deleted:
            return item
        return None

