import asyncio
from sqlmodel import select
from app.core.database import engine
from app.models.user import User

import sys

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(select(User))
        for r in res.all():
            print(f"ID: {r.id}, Email: {r.email}, Role: {r.role}, PasswordHash: {r.password_hash}")

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
