"""Menu router — public menu endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.menu.service import MenuService

router = APIRouter(prefix="/menu", tags=["menu"])


@router.get("")
async def get_menu(
    tenant_id: str = Query(
        default=None,
        description="Tenant ID (optional for MVP; uses first tenant if omitted)",
    ),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    GET /api/v1/menu

    Returns the full menu with categories and nested items.
    Only available items are included.
    """
    service = MenuService(db)
    return await service.get_full_menu(tenant_id=tenant_id)

