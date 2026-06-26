"""Dining repository — database access for tables and sessions."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dining_session import DiningSession, SessionStatus
from app.models.table import DiningTable
from app.models.tenant import Tenant


class DiningRepository:
    """Data access layer for dining tables and sessions."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def find_table_by_shortcode(self, shortcode: str) -> DiningTable | None:
        """Look up a table by its QR shortcode."""
        stmt = select(DiningTable).where(DiningTable.qr_shortcode == shortcode)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def find_active_session(self, table_id: uuid.UUID) -> DiningSession | None:
        """Find an existing ACTIVE session for a given table."""
        stmt = (
            select(DiningSession)
            .where(DiningSession.table_id == table_id)
            .where(DiningSession.status == SessionStatus.ACTIVE)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_session(self, table_id: uuid.UUID) -> DiningSession:
        """Create a new ACTIVE dining session for a table."""
        session = DiningSession(table_id=table_id, status=SessionStatus.ACTIVE)
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_tenant_for_table(self, tenant_id: uuid.UUID) -> Tenant | None:
        """Fetch the tenant that owns a table."""
        stmt = select(Tenant).where(Tenant.id == tenant_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
