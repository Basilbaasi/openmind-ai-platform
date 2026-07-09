"""
Application lifespan events.

Manages startup and shutdown logic using FastAPI's lifespan context manager.
This is the recommended approach (over deprecated @app.on_event decorators)
for initialising and tearing down shared resources like database pools,
HTTP clients, ML model caches, etc.
"""

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

    # Future phases will initialise resources here:
    # - Database connection pool
    # - Redis / cache client
    # - LLM service connections
    # - Background task scheduler

    yield  # ← Application is running and serving requests

    # ── Shutdown ─────────────────────────────────────────────────────
    logger.info("application_shutdown")

    # Future phases will clean up resources here:
    # - Close DB pool
    # - Disconnect cache client
    # - Flush pending telemetry
