"""AuditLog entity — tracks staff actions for accountability."""

import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class AuditLog(SQLModel, table=True):
    """
    Audit trail for staff actions.

    Records who did what to which entity and when.
    """

    __tablename__ = "audit_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="users.id")
    entity: str = Field(max_length=64)
    action: str = Field(max_length=64)
    entity_id: uuid.UUID | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
