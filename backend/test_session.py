import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.core.database import async_session_factory
from app.models.dining_session import DiningSession
from sqlalchemy import select
import uuid

async def run():
    async with async_session_factory() as db:
        stmt = select(DiningSession).where(DiningSession.id == uuid.UUID("ec517f63-ef6c-4bc6-8bbd-781ecdb522f5"))
        res = await db.execute(stmt)
        session = res.scalar_one_or_none()
        
        if not session:
            print("No session found!")
        else:
            print("Session status:", session.status)

asyncio.run(run())
