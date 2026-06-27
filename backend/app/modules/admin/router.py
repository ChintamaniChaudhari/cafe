"""Admin router — MVP endpoints for managing the menu."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.menu import MenuCategory, MenuItem
from app.models.order import Order, OrderItem
from app.models.user import User, UserRole
from app.modules.admin.schemas import CategoryCreate, MenuItemCreate, MenuItemUpdate

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_role([UserRole.ADMIN]))],
)


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new menu category."""
    category = MenuCategory(
        tenant_id=current_user.tenant_id,
        name=body.name,
        sort_order=body.sort_order,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return {"status": "success", "data": category}


@router.post("/items", status_code=status.HTTP_201_CREATED)
async def create_item(
    body: MenuItemCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new menu item."""
    # Verify category exists
    stmt = select(MenuCategory).where(MenuCategory.id == body.category_id)
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    item = MenuItem(
        category_id=body.category_id,
        name=body.name,
        description=body.description,
        base_price=body.base_price,
        image_url=body.image_url,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"status": "success", "data": item}


@router.patch("/items/{item_id}")
async def update_item(
    item_id: uuid.UUID,
    body: MenuItemUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update a menu item (e.g. price, availability)."""
    stmt = select(MenuItem).where(MenuItem.id == item_id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found.",
        )

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"status": "success", "data": item}


@router.get("/analytics")
async def get_analytics(db: AsyncSession = Depends(get_db)) -> dict:
    """Get high-level analytics for the admin dashboard."""
    # Total Revenue (sum of total_amount for SERVED orders)
    revenue_stmt = select(func.sum(Order.total_amount)).where(Order.status == 'SERVED')
    revenue_res = await db.execute(revenue_stmt)
    total_revenue = revenue_res.scalar() or 0.0

    # Total Orders
    total_orders_stmt = select(func.count(Order.id))
    total_orders_res = await db.execute(total_orders_stmt)
    total_orders = total_orders_res.scalar() or 0

    # Active Orders
    active_orders_stmt = select(func.count(Order.id)).where(Order.status != 'SERVED')
    active_orders_res = await db.execute(active_orders_stmt)
    active_orders = active_orders_res.scalar() or 0

    # Popular Items (Top 5)
    popular_stmt = (
        select(MenuItem.name, func.sum(OrderItem.quantity).label('total_sold'))
        .join(OrderItem, MenuItem.id == OrderItem.item_id)
        .group_by(MenuItem.id)
        .order_by(desc('total_sold'))
        .limit(5)
    )
    popular_res = await db.execute(popular_stmt)
    popular_items = [{"name": row.name, "sold": row.total_sold} for row in popular_res.all()]

    return {
        "status": "success",
        "data": {
            "total_revenue": float(total_revenue),
            "total_orders": total_orders,
            "active_orders": active_orders,
            "popular_items": popular_items,
        }
    }


@router.get("/orders")
async def get_orders(db: AsyncSession = Depends(get_db)) -> dict:
    """Get all orders with their items for the admin history view."""
    stmt = (
        select(Order)
        .order_by(desc(Order.created_at))
        .limit(100)  # MVP: last 100 orders
    )
    result = await db.execute(stmt)
    orders = result.scalars().all()
    
    order_ids = [o.id for o in orders]
    if not order_ids:
        return {"status": "success", "data": []}

    # Fetch all items for these orders
    items_stmt = select(OrderItem).where(OrderItem.order_id.in_(order_ids))
    items_res = await db.execute(items_stmt)
    all_order_items = items_res.scalars().all()

    # Group items by order_id
    items_by_order = {o_id: [] for o_id in order_ids}
    for item in all_order_items:
        items_by_order[item.order_id].append(item)

    # Map item_id to name for the frontend
    item_ids = {item.item_id for item in all_order_items}
    if item_ids:
        items_stmt = select(MenuItem.id, MenuItem.name).where(MenuItem.id.in_(item_ids))
        items_res = await db.execute(items_stmt)
        item_names = {row.id: row.name for row in items_res.all()}
    else:
        item_names = {}
        
    serialized_orders = []
    for o in orders:
        order_items = items_by_order[o.id]
        serialized_orders.append({
            "id": str(o.id),
            "order_number": o.order_number,
            "status": o.status,
            "total_amount": float(o.total_amount),
            "created_at": o.created_at.isoformat(),
            "items": [
                {
                    "name": item_names.get(oi.item_id, "Unknown Item"),
                    "quantity": oi.quantity,
                    "unit_price": float(oi.unit_price)
                } for oi in order_items
            ]
        })

    return {"status": "success", "data": serialized_orders}

