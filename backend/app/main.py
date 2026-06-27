"""
CafeOS — FastAPI Application Entry Point.

Configures:
- Async lifespan (DB init/teardown)
- CORS middleware
- All API routers under /api/v1/
- Health check endpoint
- Kitchen WebSocket event subscriptions
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import close_db, engine, init_db
from app.modules.kitchen.manager import kitchen_manager

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifecycle."""
    logger.info("🚀 Starting CafeOS %s", settings.APP_VERSION)

    # Import all models so SQLModel.metadata knows about them
    import app.models  # noqa: F401

    # Create tables (dev only — Alembic for production)
    await init_db()
    logger.info("✅ Database tables created/verified")

    # Register kitchen WS event handlers
    kitchen_manager.register_event_handlers()
    logger.info("✅ Kitchen WebSocket event handlers registered")

    yield

    # Shutdown
    await close_db()
    logger.info("🛑 CafeOS shut down gracefully")


# ── App Factory ───────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Restaurant Operating System — QR Ordering & Kitchen Display",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,  # Required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount Routers ─────────────────────────────────────────────
from app.modules.dining.router import router as dining_router
from app.modules.menu.router import router as menu_router
from app.modules.orders.router import router as orders_router
from app.modules.kitchen.router import router as kitchen_router
from app.modules.auth.router import router as auth_router
from app.modules.admin.router import router as admin_router

app.include_router(admin_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(dining_router, prefix="/api/v1")
app.include_router(menu_router, prefix="/api/v1")
app.include_router(orders_router, prefix="/api/v1")
app.include_router(kitchen_router, prefix="/api/v1")


# ── Health Check ──────────────────────────────────────────────
@app.get("/api/v1/health", tags=["health"])
async def health_check() -> dict:
    """
    GET /api/v1/health

    Pings the Postgres database and returns connection status.
    """
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        logger.error("Health check failed: %s", e)
        return {"status": "error", "db": "disconnected", "detail": str(e)}
