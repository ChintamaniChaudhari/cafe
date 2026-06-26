"""DiningTable entity — physical tables in the restaurant."""

import uuid

from sqlmodel import Field, SQLModel, UniqueConstraint


class DiningTable(SQLModel, table=True):
    """
    Physical dining table with a QR shortcode.

    qr_shortcode is globally unique and used in the QR scan URL.
    Never expose sequential table IDs — use shortcodes instead.
    """

    __tablename__ = "tables"
    __table_args__ = (
        UniqueConstraint("tenant_id", "label", name="unique_table_label_per_tenant"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenants.id", index=True)
    label: str = Field(max_length=16)
    qr_shortcode: str = Field(max_length=12, unique=True, index=True)
    is_occupied: bool = Field(default=False)
