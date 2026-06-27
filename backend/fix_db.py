import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.core.database import engine
from sqlalchemy import text

async def run():
    async with engine.begin() as conn:
        try:
            # Fix orderstatus
            await conn.execute(text("ALTER TYPE orderstatus ADD VALUE 'CANCELED'"))
            print("Added CANCELED to orderstatus")
        except Exception as e:
            print(e)
            
        try:
            # Fix sessionstatus
            await conn.execute(text("ALTER TYPE sessionstatus ADD VALUE 'PAYMENT_PENDING'"))
            print("Added PAYMENT_PENDING to sessionstatus")
        except Exception as e:
            print(e)
            
        try:
            res = await conn.execute(text("SELECT unnest(enum_range(NULL::userrole))"))
            print("userrole:", [r[0] for r in res])
        except Exception as e:
            print(e)

asyncio.run(run())
