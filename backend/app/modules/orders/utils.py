"""Orders utilities — helpers for event payloads."""

from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dining_session import DiningSession
from app.models.menu import MenuItem
from app.models.order import Order, OrderItem
from app.models.table import DiningTable

async def build_order_event_payload(
    db: AsyncSession, 
    orders: Sequence[Order],
    event_type: str = "ORDER_CREATED"
) -> list[dict]:
    """
    Builds the event payload for a list of orders in an optimized way.
    Avoids N+1 queries by fetching sessions, tables, and items in batch.
    """
    if not orders:
        return []

    order_ids = [order.id for order in orders]
    session_ids = [order.session_id for order in orders]

    # Batch fetch sessions
    stmt = select(DiningSession).where(DiningSession.id.in_(session_ids))
    result = await db.execute(stmt)
    sessions = {s.id: s for s in result.scalars().all()}

    table_ids = [s.table_id for s in sessions.values()]

    # Batch fetch tables
    stmt = select(DiningTable).where(DiningTable.id.in_(table_ids))
    result = await db.execute(stmt)
    tables = {t.id: t for t in result.scalars().all()}

    # Batch fetch order items
    stmt = select(OrderItem).where(OrderItem.order_id.in_(order_ids))
    result = await db.execute(stmt)
    order_items = result.scalars().all()
    
    item_ids = [oi.item_id for oi in order_items]

    # Batch fetch menu items
    stmt = select(MenuItem).where(MenuItem.id.in_(item_ids))
    result = await db.execute(stmt)
    menu_items = {mi.id: mi for mi in result.scalars().all()}

    # Group items by order
    items_by_order = {}
    for oi in order_items:
        if oi.order_id not in items_by_order:
            items_by_order[oi.order_id] = []
        
        mi = menu_items.get(oi.item_id)
        items_by_order[oi.order_id].append({
            "name": mi.name if mi else "Unknown",
            "quantity": oi.quantity,
            "unit_price": float(oi.unit_price),
            "notes": oi.item_notes,
            "selected_modifiers": oi.selected_modifiers,
        })

    # Build payloads
    payloads = []
    for order in orders:
        session = sessions.get(order.session_id)
        table = tables.get(session.table_id) if session else None
        
        payload = {
            "event": event_type,
            "data": {
                "order_id": str(order.id),
                "order_number": order.order_number,
                "table_label": table.label if table else "Unknown",
                "status": order.status.value,
                "subtotal": float(order.subtotal),
                "tax_amount": float(order.tax_amount),
                "discount_amount": float(order.discount_amount),
                "total_amount": float(order.total_amount),
                "items": items_by_order.get(order.id, []),
                "created_at": order.created_at.isoformat(),
            }
        }
        payloads.append(payload)

    return payloads
