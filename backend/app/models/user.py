"""User entity — staff accounts (admin, kitchen)."""

import enum
import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class UserRole(str, enum.Enum):
    """User roles for MVP."""

    ADMIN = "ADMIN"
    KITCHEN = "KITCHEN"


class User(SQLModel, table=True):
    """Staff user account. Customers do NOT have user accounts (Zero-Friction Rule)."""

    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenants.id", index=True)
    name: str = Field(max_length=128)
    email: str = Field(max_length=256, unique=True, index=True)
    password_hash: str = Field(max_length=512)
    role: UserRole = Field(default=UserRole.ADMIN)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
