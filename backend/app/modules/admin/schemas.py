"""Admin schemas — models for admin endpoints."""

import uuid
from pydantic import BaseModel, Field

class MenuItemCreate(BaseModel):
    category_id: uuid.UUID
    name: str = Field(max_length=128)
    description: str | None = None
    base_price: float = Field(gt=0)
    image_url: str | None = None
    modifiers: list[dict] | None = None

class MenuItemUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    description: str | None = None
    base_price: float | None = Field(None, gt=0)
    is_available: bool | None = None
    is_deleted: bool | None = None
    image_url: str | None = None
    modifiers: list[dict] | None = None

class CategoryCreate(BaseModel):
    name: str = Field(max_length=64)
    sort_order: int = 0

class TableCreate(BaseModel):
    label: str = Field(max_length=16)

class StaffCreate(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(min_length=6)
    role: str = Field(description="ADMIN or KITCHEN")

    def model_post_init(self, __context) -> None:
        if self.username:
            self.username = self.username.strip().lower()
