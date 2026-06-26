"""DiningSession entity — tracks an active customer visit at a table."""

import enum
import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class SessionStatus(str, enum.Enum):
    """Dining session lifecycle states."""

    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class DiningSession(SQLModel, table=True):
    """
    An active dining session tied to a physical table.

    Created when a customer scans a QR code.
    Session ID is stored in the cafeos_session HTTP-only cookie.
    """

    __tablename__ = "dining_sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    table_id: uuid.UUID = Field(foreign_key="tables.id", index=True)
    status: SessionStatus = Field(default=SessionStatus.ACTIVE)
    opened_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    closed_at: datetime | None = Field(default=None)
