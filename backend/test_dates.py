import asyncio
import sys
from datetime import datetime, timedelta, timezone

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.core.database import async_session_factory
from app.models.order import Order
from sqlalchemy import select, func

async def run():
    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)
        seven_days_ago = now - timedelta(days=7)
        daily_revenue_stmt = (
            select(
                func.date(Order.created_at).label('day'),
                func.sum(Order.total_amount).label('daily_total')
            )
            .where(Order.status == 'SERVED', Order.created_at >= seven_days_ago)
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
        )
        res = await db.execute(daily_revenue_stmt)
        all_res = res.all()
        revenue_dict = {str(row.day): row.daily_total for row in all_res}
        print("revenue_dict:", revenue_dict)
        
        daily_revenue = []
        for i in range(7):
            d = (now - timedelta(days=6 - i)).date()
            date_str = str(d)
            print(f"Checking {date_str}...")
            daily_revenue.append({
                "date": d.strftime("%a"),
                "revenue": float(revenue_dict.get(date_str, 0))
            })
        print(daily_revenue)

asyncio.run(run())
