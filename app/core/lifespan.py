"""
Application lifespan events.

Manages startup and shutdown logic using FastAPI's lifespan context manager.
This is the recommended approach (over deprecated @app.on_event decorators)
for initialising and tearing down shared resources like database pools,
HTTP clients, ML model caches, etc.
"""

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.logging import get_logger, setup_logging

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager.

    Everything before ``yield`` runs on startup; everything after runs on
    shutdown. Shared resources can be attached to ``app.state`` so they
    are accessible from request handlers via dependency injection.
    """
    settings = get_settings()

    # ── Startup ──────────────────────────────────────────────────────
    setup_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
    logger.info(
        "application_startup",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Database – create tables if they don't exist (dev convenience)
    # Import all models so Base.metadata knows about them
    import app.models  # noqa: F401
    from sqlalchemy import text
    from app.core.database import engine
    from app.models.base import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Idempotently ensure new columns exist in existing PostgreSQL/SQLite tables
        try:
            if settings.DATABASE_URL.startswith("sqlite"):
                await conn.execute(text("ALTER TABLE knowledge_sources ADD COLUMN embedding_model VARCHAR(255)"))
            else:
                await conn.execute(text("ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(255)"))
                await conn.execute(text("ALTER TABLE models ALTER COLUMN execution_mode DROP NOT NULL"))
        except Exception:
            pass  # Already altered or column not present
    logger.info("database_initialized", url=settings.DATABASE_URL.split("@")[-1])

    yield  # ← Application is running and serving requests

    # ── Shutdown ─────────────────────────────────────────────────────
    logger.info("application_shutdown")

    # Close the database connection pool
    from app.core.database import engine as db_engine

    await db_engine.dispose()
    logger.info("database_connections_closed")
