import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.core.database import async_session_factory
from app.models.feedback import Feedback
from sqlalchemy import select
from app.models.dining_session import DiningSession
from app.models.table import DiningTable
import uuid

async def run():
    async with async_session_factory() as db:
        stmt = (
            select(DiningSession, DiningTable)
            .join(DiningTable, DiningSession.table_id == DiningTable.id)
            .limit(1)
        )
        res = await db.execute(stmt)
        row = res.first()
        
        if not row:
            print("No session/table found")
            return
            
        session, table = row
        print("Creating feedback for session", session.id)
        
        try:
            feedback = Feedback(
                tenant_id=table.tenant_id,
                session_id=session.id,
                rating=5,
                comment="Test feedback"
            )
            db.add(feedback)
            await db.commit()
            print("Success!")
        except Exception as e:
            print("ERROR:", e)

asyncio.run(run())
