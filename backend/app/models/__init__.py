"""
CafeOS SQLModel table definitions.

Import all models here so SQLModel.metadata.create_all() discovers them.
"""

from app.models.audit_log import AuditLog
from app.models.dining_session import DiningSession, SessionStatus
from app.models.menu import MenuCategory, MenuItem
from app.models.order import (
    InvalidTransitionError,
    Order,
    OrderItem,
    OrderStatus,
    validate_transition,
)
from app.models.table import DiningTable
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.feedback import Feedback

__all__ = [
    "AuditLog",
    "DiningSession",
    "DiningTable",
    "Feedback",
    "InvalidTransitionError",
    "MenuCategory",
    "MenuItem",
    "Order",
    "OrderItem",
    "OrderStatus",
    "SessionStatus",
    "Tenant",
    "User",
    "UserRole",
    "validate_transition",
]
