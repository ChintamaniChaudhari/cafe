"""Tenant entity — represents a café or restaurant."""

import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class Tenant(SQLModel, table=True):
    """A café / restaurant tenant. Foundation for future multi-tenant SaaS."""

    __tablename__ = "tenants"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    slug: str = Field(max_length=64, unique=True, index=True)
    name: str = Field(max_length=128)
    currency_symbol: str = Field(max_length=8, default="₹")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
