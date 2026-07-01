import asyncio
import sys
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
from app.core.database import engine
from app.models.user import User
from app.core.security import hash_password
from sqlalchemy import text

async def update():
    async with engine.begin() as conn:
        new_hash = hash_password('admin123')
        await conn.execute(
            text("UPDATE users SET password_hash = :hash WHERE email = 'admin@smartcafe.com'"),
            {'hash': new_hash}
        )
        print('Password updated to admin123')

asyncio.run(update())
