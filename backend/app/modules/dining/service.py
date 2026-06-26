"""Dining service — business logic for QR scan and session creation."""

import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.dining.repository import DiningRepository

logger = logging.getLogger(__name__)


class DiningService:
    """Handles QR scan → table lookup → session creation/reuse."""

    def __init__(self, db: AsyncSession) -> None:
        self.repo = DiningRepository(db)

    async def get_or_create_session(self, shortcode: str) -> dict:
        """
        Main QR scan flow:
        1. Look up table by shortcode
        2. Check for existing ACTIVE session → reuse
        3. Otherwise create new session
        4. Return tenant + table + session data for cookie + response

        Raises HTTPException 404 if shortcode is invalid.
        """
        # 1. Find the table
        table = await self.repo.find_table_by_shortcode(shortcode)
        if not table:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table with shortcode '{shortcode}' not found.",
            )

        # 2. Check for active session
        session = await self.repo.find_active_session(table.id)

        # 3. Create if needed
        if not session:
            session = await self.repo.create_session(table.id)
            logger.info("Created new session %s for table %s", session.id, table.label)
        else:
            logger.info("Reusing session %s for table %s", session.id, table.label)

        # 4. Fetch tenant info
        tenant = await self.repo.get_tenant_for_table(table.tenant_id)

        return {
            "status": "success",
            "data": {
                "tenant": {
                    "id": str(tenant.id) if tenant else None,
                    "name": tenant.name if tenant else None,
                    "currency": tenant.currency_symbol if tenant else "₹",
                },
                "table": {
                    "id": str(table.id),
                    "label": table.label,
                },
                "session": {
                    "id": str(session.id),
                    "opened_at": session.opened_at.isoformat(),
                },
            },
        }
