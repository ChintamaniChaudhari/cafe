"""
CafeOS seed script.

Populates the development database with:
- 1 Tenant: SmartCafe Nagpur
- 1 Admin User (admin@smartcafe.com / admin123)
- 4 Tables: T-01 through T-04 (T-04 shortcode = DEMO123)
- 5 Categories: Beverages, Appetizers, Main Course, Desserts, Specials
- 22 Menu Items across categories

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
from app.core.security import hash_password
from app.models.menu import MenuCategory, MenuItem
from app.models.table import DiningTable
from app.models.tenant import Tenant
from app.models.user import User, UserRole

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

        # ── Admin User ────────────────────────────────────────
        result = await db.execute(
            select(User).where(User.email == "admin@smartcafe.com")
        )
        admin_user = result.scalar_one_or_none()

        if not admin_user:
            admin_user = User(
                tenant_id=tenant.id,
                name="Admin User",
                email="admin@smartcafe.com",
                password_hash=hash_password("admin123"),
                role=UserRole.ADMIN,
            )
            db.add(admin_user)
            await db.flush()
            print(f"✅ Created admin user: {admin_user.email}")
        else:
            print(f"ℹ️  Admin user already exists: {admin_user.email}")

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

        # ── Categories & Items ────────────────────────────────
        menu_data = [
            {
                "category": {"name": "Beverages", "sort_order": 1},
                "items": [
                    {"name": "Iced Latte", "description": "Smooth espresso over ice with milk", "base_price": 160.00},
                    {"name": "Cold Brew", "description": "Slow-steeped cold brew coffee", "base_price": 180.00},
                    {"name": "Mango Smoothie", "description": "Fresh mango blended with yogurt", "base_price": 200.00},
                    {"name": "Cappuccino", "description": "Classic espresso with steamed milk foam", "base_price": 150.00},
                    {"name": "Matcha Latte", "description": "Premium green tea powder with steamed milk", "base_price": 190.00},
                ],
            },
            {
                "category": {"name": "Appetizers", "sort_order": 2},
                "items": [
                    {"name": "Truffle Fries", "description": "Crispy fries tossed in truffle oil and parmesan", "base_price": 220.00},
                    {"name": "Bruschetta", "description": "Toasted bread with tomatoes, garlic, and basil", "base_price": 180.00},
                    {"name": "Garlic Bread", "description": "Oven-baked bread with garlic butter and herbs", "base_price": 150.00},
                    {"name": "Calamari", "description": "Lightly battered and fried squid rings", "base_price": 280.00},
                    {"name": "Stuffed Mushrooms", "description": "Mushroom caps stuffed with cheese and herbs", "base_price": 240.00},
                ],
            },
            {
                "category": {"name": "Main Course", "sort_order": 3},
                "items": [
                    {"name": "Margherita Pizza", "description": "Classic pizza with tomato sauce, mozzarella, and basil", "base_price": 350.00},
                    {"name": "Pesto Pasta", "description": "Penne pasta tossed in homemade basil pesto", "base_price": 320.00},
                    {"name": "Grilled Salmon", "description": "Fresh salmon fillet with roasted vegetables", "base_price": 550.00},
                    {"name": "Veggie Burger", "description": "Plant-based patty with lettuce, tomato, and vegan mayo", "base_price": 280.00},
                    {"name": "Chicken Club Sandwich", "description": "Triple-decker sandwich with grilled chicken and bacon", "base_price": 310.00},
                ],
            },
            {
                "category": {"name": "Desserts", "sort_order": 4},
                "items": [
                    {"name": "Tiramisu", "description": "Classic Italian dessert with coffee-soaked ladyfingers", "base_price": 240.00},
                    {"name": "Cheesecake", "description": "New York style cheesecake with berry compote", "base_price": 260.00},
                    {"name": "Chocolate Lava Cake", "description": "Warm chocolate cake with a gooey center", "base_price": 220.00},
                    {"name": "Gelato", "description": "Two scoops of artisanal Italian ice cream", "base_price": 180.00},
                ],
            },
            {
                "category": {"name": "Specials", "sort_order": 5},
                "items": [
                    {"name": "Chef's Tasting Menu", "description": "A curated 3-course meal by our head chef", "base_price": 899.00},
                    {"name": "Seasonal Soup", "description": "Soup of the day made with fresh seasonal ingredients", "base_price": 190.00},
                    {"name": "Wagyu Steak", "description": "Premium wagyu beef steak cooked to perfection", "base_price": 1200.00},
                ],
            },
        ]

        for block in menu_data:
            cat_info = block["category"]
            result = await db.execute(
                select(MenuCategory).where(
                    MenuCategory.tenant_id == tenant.id,
                    MenuCategory.name == cat_info["name"],
                )
            )
            category = result.scalar_one_or_none()

            if not category:
                category = MenuCategory(
                    tenant_id=tenant.id,
                    name=cat_info["name"],
                    sort_order=cat_info["sort_order"],
                )
                db.add(category)
                await db.flush()
                print(f"✅ Created category: {category.name}")
            else:
                print(f"ℹ️  Category already exists: {category.name}")

            for item_data in block["items"]:
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
                        name=item_data["name"],
                        description=item_data["description"],
                        base_price=item_data["base_price"],
                    )
                    db.add(item)
                    print(f"  + Created item: {item.name}")

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
