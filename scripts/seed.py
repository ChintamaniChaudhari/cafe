"""
CafeOS seed script.

Populates the development database with:
- 1 Tenant: SmartCafe Nagpur
- 4 Tables: T-01 through T-04 (T-04 shortcode = DEMO123)
- 1 Category: Beverages
- 3 Menu Items: Iced Latte (₹160), Cold Brew (₹180), Mango Smoothie (₹200)

Usage:
    cd backend
    python -m scripts.seed

Idempotent: checks for existing data before inserting.
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from sqlalchemy import select

from app.core.database import async_session_factory, init_db
from app.models.menu import MenuCategory, MenuItem
from app.models.table import DiningTable
from app.models.tenant import Tenant

# Ensure all models are imported for table creation
import app.models  # noqa: F401


async def seed() -> None:
    """Seed the database with development data."""
    # Create tables
    await init_db()

    async with async_session_factory() as db:
        # ── Tenant ────────────────────────────────────────────
        result = await db.execute(
            select(Tenant).where(Tenant.slug == "smartcafe-nagpur")
        )
        tenant = result.scalar_one_or_none()

        if not tenant:
            tenant = Tenant(
                slug="smartcafe-nagpur",
                name="SmartCafe Nagpur",
                currency_symbol="₹",
            )
            db.add(tenant)
            await db.flush()
            print(f"✅ Created tenant: {tenant.name} ({tenant.id})")
        else:
            print(f"ℹ️  Tenant already exists: {tenant.name}")

        # ── Tables ────────────────────────────────────────────
        table_data = [
            {"label": "T-01", "qr_shortcode": "TBL001"},
            {"label": "T-02", "qr_shortcode": "TBL002"},
            {"label": "T-03", "qr_shortcode": "TBL003"},
            {"label": "T-04", "qr_shortcode": "DEMO123"},
        ]

        for td in table_data:
            result = await db.execute(
                select(DiningTable).where(
                    DiningTable.qr_shortcode == td["qr_shortcode"]
                )
            )
            existing = result.scalar_one_or_none()
            if not existing:
                table = DiningTable(
                    tenant_id=tenant.id,
                    label=td["label"],
                    qr_shortcode=td["qr_shortcode"],
                )
                db.add(table)
                print(f"✅ Created table: {td['label']} (shortcode: {td['qr_shortcode']})")
            else:
                print(f"ℹ️  Table already exists: {td['label']}")

        await db.flush()

        # ── Category ──────────────────────────────────────────
        result = await db.execute(
            select(MenuCategory).where(
                MenuCategory.tenant_id == tenant.id,
                MenuCategory.name == "Beverages",
            )
        )
        category = result.scalar_one_or_none()

        if not category:
            category = MenuCategory(
                tenant_id=tenant.id,
                name="Beverages",
                sort_order=1,
            )
            db.add(category)
            await db.flush()
            print(f"✅ Created category: Beverages ({category.id})")
        else:
            print(f"ℹ️  Category already exists: Beverages")

        # ── Menu Items ────────────────────────────────────────
        items_data = [
            {
                "name": "Iced Latte",
                "description": "Smooth espresso over ice with milk",
                "base_price": 160.00,
                "image_url": None,
            },
            {
                "name": "Cold Brew",
                "description": "Slow-steeped cold brew coffee",
                "base_price": 180.00,
                "image_url": None,
            },
            {
                "name": "Mango Smoothie",
                "description": "Fresh mango blended with yogurt",
                "base_price": 200.00,
                "image_url": None,
            },
        ]

        for item_data in items_data:
            result = await db.execute(
                select(MenuItem).where(
                    MenuItem.category_id == category.id,
                    MenuItem.name == item_data["name"],
                )
            )
            existing = result.scalar_one_or_none()
            if not existing:
                item = MenuItem(
                    category_id=category.id,
                    **item_data,
                )
                db.add(item)
                print(f"✅ Created item: {item_data['name']} (₹{item_data['base_price']})")
            else:
                print(f"ℹ️  Item already exists: {item_data['name']}")

        await db.commit()
        print("\n🎉 Seed complete!")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
