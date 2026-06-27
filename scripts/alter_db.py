import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.core.database import engine
from sqlalchemy import text

async def alter_db():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE orders ADD COLUMN subtotal NUMERIC(10, 2) DEFAULT 0;"))
            await conn.execute(text("ALTER TABLE orders ADD COLUMN tax_amount NUMERIC(10, 2) DEFAULT 0;"))
            await conn.execute(text("ALTER TABLE orders ADD COLUMN discount_amount NUMERIC(10, 2) DEFAULT 0;"))
            print("Successfully added billing columns to the orders table.")
        except Exception as e:
            print("Error altering table:", e)
    
    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(alter_db())
