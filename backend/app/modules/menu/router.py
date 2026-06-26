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

    # MVP: if no tenant_id provided, fetch from first tenant
    if tenant_id:
        import uuid

        tid = uuid.UUID(tenant_id)
    else:
        # For MVP single-tenant: find the first tenant
        from sqlalchemy import select

        from app.models.tenant import Tenant

        result = await db.execute(select(Tenant).limit(1))
        tenant = result.scalar_one_or_none()
        if not tenant:
            return {"categories": []}
        tid = tenant.id

    return await service.get_full_menu(tid)
