"""Admin router — MVP endpoints for managing the menu."""

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import shutil
import os
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.menu import MenuCategory, MenuItem
from app.models.order import Order, OrderItem
from app.models.dining_session import DiningSession, SessionStatus
from app.models.table import DiningTable
from app.models.user import User, UserRole
from app.core.security import hash_password
from app.models.feedback import Feedback
from app.modules.admin.schemas import CategoryCreate, MenuItemCreate, MenuItemUpdate, TableCreate, StaffCreate

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_role([UserRole.ADMIN]))],
)


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Upload an image to the static directory."""
    MAX_SIZE = 5 * 1024 * 1024  # 5 MB

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Image must be smaller than 5 MB.")

    # Sanitize the filename to prevent directory traversal attacks
    safe_filename = os.path.basename(file.filename) if file.filename else "upload.bin"
    safe_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', safe_filename)

    filename = f"{uuid.uuid4()}_{safe_filename}"
    filepath = os.path.join("app/static/images", filename)

    with open(filepath, "wb") as buffer:
        buffer.write(content)

    return {"url": f"/static/images/{filename}"}


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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new menu item."""
    # Verify category exists AND belongs to current user's tenant
    stmt = select(MenuCategory).where(
        MenuCategory.id == body.category_id,
        MenuCategory.tenant_id == current_user.tenant_id
    )
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
        modifiers=body.modifiers or [],
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
    stmt = select(MenuItem).where(MenuItem.id == item_id, MenuItem.is_deleted == False)
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


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Soft delete a menu item."""
    stmt = select(MenuItem).where(MenuItem.id == item_id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item or item.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found.",
        )

    item.is_deleted = True
    # Also set is_available to False just in case
    item.is_available = False
    
    db.add(item)
    await db.commit()
    return {"status": "success"}


@router.post("/sessions/{session_id}/close")
async def close_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Admin marks a session as CLOSED (paid)."""
    from datetime import datetime, timezone

    stmt = select(DiningSession).where(DiningSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    # Guard: block closing if any orders are still being prepared or ready
    active_orders_stmt = select(Order.id).where(
        Order.session_id == session_id,
        Order.status.in_(["RECEIVED", "PREPARING", "READY"])
    ).limit(1)
    active_orders_res = await db.execute(active_orders_stmt)
    if active_orders_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot close session: orders are still being prepared.",
        )

    session.status = SessionStatus.CLOSED
    session.closed_at = datetime.now(timezone.utc)

    db.add(session)
    await db.commit()
    return {"status": "success"}


@router.get("/tables")
async def get_tables(db: AsyncSession = Depends(get_db)) -> dict:
    """Get all tables."""
    stmt = select(DiningTable).order_by(DiningTable.label)
    result = await db.execute(stmt)
    tables = result.scalars().all()
    return {"status": "success", "data": tables}

@router.post("/tables", status_code=status.HTTP_201_CREATED)
async def create_table(
    body: TableCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Create a new table."""
    import random
    import string
    
    # Generate unique shortcode
    while True:
        shortcode = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        stmt = select(DiningTable).where(DiningTable.qr_shortcode == shortcode)
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            break

    table = DiningTable(
        tenant_id=current_user.tenant_id,
        label=body.label,
        qr_shortcode=shortcode,
    )
    db.add(table)
    await db.commit()
    await db.refresh(table)
    return {"status": "success", "data": table}

@router.delete("/tables/{table_id}")
async def delete_table(
    table_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Delete a table."""
    stmt = select(DiningTable).where(DiningTable.id == table_id)
    result = await db.execute(stmt)
    table = result.scalar_one_or_none()

    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found.",
        )

    # Guard: block deletion if any active session references this table
    active_session_stmt = select(DiningSession.id).where(
        DiningSession.table_id == table_id,
        DiningSession.status.in_([SessionStatus.ACTIVE, SessionStatus.PAYMENT_PENDING])
    ).limit(1)
    active_session_res = await db.execute(active_session_stmt)
    if active_session_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete table: it has an active session.",
        )

    await db.delete(table)
    await db.commit()
    return {"status": "success"}


@router.get("/sessions")
async def get_active_sessions(db: AsyncSession = Depends(get_db)) -> dict:
    """Get all active and payment pending sessions with their total bill."""
    # Join DiningTable to get table label, join orders for total bill
    stmt = (
        select(
            DiningSession,
            DiningTable.label.label("table_label"),
            func.sum(Order.total_amount).label("total_bill")
        )
        .join(DiningTable, DiningSession.table_id == DiningTable.id)
        .outerjoin(Order, (Order.session_id == DiningSession.id) & (Order.status != 'CANCELED'))
        .where(DiningSession.status.in_([SessionStatus.ACTIVE, SessionStatus.PAYMENT_PENDING]))
        .group_by(DiningSession.id, DiningTable.label)
        .order_by(desc(DiningSession.opened_at))
    )
    result = await db.execute(stmt)
    rows = result.all()

    data = []
    for session, table_label, total_bill in rows:
        data.append({
            "id": str(session.id),
            "status": session.status,
            "opened_at": session.opened_at.isoformat(),
            "total_bill": float(total_bill or 0.0),
            "table_label": table_label or "Unknown",
        })

    return {"status": "success", "data": data}


@router.get("/analytics")
async def get_analytics(db: AsyncSession = Depends(get_db)) -> dict:
    """Get high-level analytics for the admin dashboard."""
    from datetime import datetime, timedelta, timezone
    
    # Total Revenue (sum of total_amount for SERVED and READY orders)
    revenue_stmt = select(func.sum(Order.total_amount)).where(
        Order.status.in_(['SERVED', 'READY'])
    )
    revenue_res = await db.execute(revenue_stmt)
    total_revenue = float(revenue_res.scalar() or 0.0)

    # Total Orders (exclude canceled)
    total_orders_stmt = select(func.count(Order.id)).where(Order.status != 'CANCELED')
    total_orders_res = await db.execute(total_orders_stmt)
    total_orders = total_orders_res.scalar() or 0

    # Active Orders
    active_orders_stmt = select(func.count(Order.id)).where(~Order.status.in_(['SERVED', 'CANCELED']))
    active_orders_res = await db.execute(active_orders_stmt)
    active_orders = active_orders_res.scalar() or 0

    # Popular Items (Top 5)
    popular_stmt = (
        select(MenuItem.name, func.sum(OrderItem.quantity).label('total_sold'))
        .join(OrderItem, MenuItem.id == OrderItem.item_id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status != 'CANCELED')
        .group_by(MenuItem.id)
        .order_by(desc('total_sold'))
        .limit(5)
    )
    popular_res = await db.execute(popular_stmt)
    popular_items = [{"name": row.name, "sold": row.total_sold} for row in popular_res.all()]

    # Time-series: Daily revenue for the last 7 days
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    
    # Cast created_at to Date to group by day
    # SQLite uses substr, but SQLAlchemy func.date() works for standard date formatting
    daily_revenue_stmt = (
        select(
            func.date(Order.created_at).label('day'),
            func.sum(Order.total_amount).label('daily_total')
        )
        .where(Order.status.in_(['SERVED', 'READY']), Order.created_at >= seven_days_ago)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    )
    daily_revenue_res = await db.execute(daily_revenue_stmt)
    revenue_by_day = {str(row.day): row.daily_total for row in daily_revenue_res.all()}

    # Fill in missing days with 0
    daily_revenue = []
    for i in range(7):
        d = (now - timedelta(days=6 - i)).date()
        date_str = str(d)
        daily_revenue.append({
            "date": date_str,
            "revenue": float(revenue_by_day.get(date_str, 0.0))
        })

    aov = round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0

    return {
        "status": "success",
        "data": {
            "total_revenue": float(total_revenue),
            "total_orders": total_orders,
            "active_orders": active_orders,
            "average_order_value": aov,
            "popular_items": popular_items,
            "daily_revenue": daily_revenue
        }
    }


@router.get("/staff")
async def get_staff(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Get all staff accounts for this tenant."""
    stmt = select(User).where(User.tenant_id == current_user.tenant_id).order_by(User.name)
    result = await db.execute(stmt)
    staff = result.scalars().all()
    data = [
        # Use u.name as the canonical username (email is a mock internal field)
        {"id": str(u.id), "username": u.name, "role": u.role}
        for u in staff
    ]
    return {"status": "success", "data": data}


@router.post("/staff", status_code=status.HTTP_201_CREATED)
async def create_staff(
    body: StaffCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Create a new staff account."""
    if body.role not in [UserRole.ADMIN, UserRole.KITCHEN]:
        raise HTTPException(status_code=400, detail="Invalid role.")

    # Check username exists
    stmt = select(User).where(User.username == body.username)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists.")

    new_user = User(
        tenant_id=current_user.tenant_id,
        name=body.username,
        email=f"{body.username}@cafe.local",  # Mock email for username-based login
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "status": "success",
        "data": {"id": str(new_user.id), "username": new_user.name, "role": new_user.role}
    }


@router.delete("/staff/{user_id}")
async def delete_staff(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Delete a staff account."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")

    stmt = select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    res = await db.execute(stmt)
    user_to_delete = res.scalar_one_or_none()

    if not user_to_delete:
        raise HTTPException(status_code=404, detail="Staff account not found.")

    if user_to_delete.role == "ADMIN":
        # Check if this is the last admin
        count_stmt = select(func.count(User.id)).where(
            User.tenant_id == current_user.tenant_id,
            User.role == "ADMIN"
        )
        count_res = await db.execute(count_stmt)
        admin_count = count_res.scalar_one()
        
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin account.")

    await db.delete(user_to_delete)
    await db.commit()
    return {"status": "success"}


@router.get("/feedback")
async def get_feedback(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Get all feedback for this tenant."""
    stmt = (
        select(Feedback, DiningSession.id.label("session_id"))
        .outerjoin(DiningSession, Feedback.session_id == DiningSession.id)
        .where(Feedback.tenant_id == current_user.tenant_id)
        .order_by(desc(Feedback.created_at))
    )
    res = await db.execute(stmt)
    rows = res.all()
    
    data = []
    for f, sid in rows:
        data.append({
            "id": str(f.id),
            "session_id": str(sid) if sid else None,
            "rating": f.rating,
            "comment": f.comment,
            "created_at": f.created_at.isoformat()
        })
    return {"status": "success", "data": data}


@router.get("/orders")
async def get_orders(
    skip: int = 0,
    limit: int = 50,
    session_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Get all orders with their items for the admin history view."""
    
    # First get total count
    count_stmt = select(func.count(Order.id))
    if session_id:
        count_stmt = count_stmt.where(Order.session_id == session_id)
        
    count_res = await db.execute(count_stmt)
    total_count = count_res.scalar() or 0

    stmt = select(Order).order_by(desc(Order.created_at))
    if session_id:
        stmt = stmt.where(Order.session_id == session_id)
        
    stmt = stmt.offset(skip).limit(limit)
    
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
        
    # We need session -> table map for the table_label
    from app.models.dining_session import DiningSession
    from app.models.table import DiningTable
    session_ids = [o.session_id for o in orders]
    tables_map = {}
    if session_ids:
        sess_stmt = select(DiningSession.id, DiningTable.label).join(DiningTable, DiningSession.table_id == DiningTable.id).where(DiningSession.id.in_(session_ids))
        sess_res = await db.execute(sess_stmt)
        tables_map = {row.id: row.label for row in sess_res.all()}

    serialized_orders = []
    for order in orders:
        serialized_orders.append({
            "id": str(order.id),
            "order_number": order.order_number,
            "status": order.status,
            "total_amount": float(order.total_amount),
            "items": [
                {
                    "id": str(item.id),
                    "item_id": str(item.item_id),
                    "name": item_names.get(item.item_id, "Unknown"),
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price),
                    "item_notes": item.item_notes,
                    "selected_modifiers": item.selected_modifiers,
                }
                for item in items_by_order[order.id]
            ],
            "table_label": tables_map.get(order.session_id, "Unknown"),
            "created_at": order.created_at.isoformat()
        })

    return {
        "status": "success", 
        "data": serialized_orders,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }
