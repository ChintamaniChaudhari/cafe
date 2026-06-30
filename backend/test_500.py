
import asyncio
import uuid
from app.core.database import async_session_factory
from app.modules.orders.service import OrderService

async def main():
    async with async_session_factory() as db:
        service = OrderService(db)
        # Give it a random UUID, it should just return empty list, unless it crashes
        res = await service.get_session_orders(uuid.uuid4())
        print(res)

if __name__ == '__main__':
    asyncio.run(main())

