import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.core.database import async_session_factory
from app.modules.orders.router import place_order
from app.modules.orders.schemas import OrderCreate, OrderItemCreate
from app.models.dining_session import DiningSession
from app.models.menu import MenuItem
from sqlalchemy import select
import uuid
from fastapi import Request

async def run():
    async with async_session_factory() as db:
        # Get an active session
        stmt = select(DiningSession).where(DiningSession.status == "ACTIVE").limit(1)
        res = await db.execute(stmt)
        session = res.scalar_one_or_none()
        
        if not session:
            # Create a mock active session
            stmt2 = select(DiningSession).limit(1)
            res2 = await db.execute(stmt2)
            session = res2.scalar_one()
            session.status = "ACTIVE"
            await db.commit()
            print("Set session to active:", session.id)
            
        print("Using session:", session.id)
        
        # Get a menu item
        stmt3 = select(MenuItem).limit(1)
        res3 = await db.execute(stmt3)
        item = res3.scalar_one()
        print("Using item:", item.name)

        # We need a mock request object for the dependency. 
        # Actually it's easier to just call the router with a mock request, but Request is hard to mock in FastAPI dependency.
        # Let's test the service layer instead! Or just the code in the router.
        
asyncio.run(run())
