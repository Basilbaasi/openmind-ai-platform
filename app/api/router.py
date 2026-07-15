"""
Central API router.

Aggregates all domain routers into a single top-level router that
the FastAPI application mounts. This keeps main.py clean and allows
each feature area to own its own routing.

To add a new feature:
    1. Create a new module in app/api/routes/ with its own APIRouter.
    2. Import and include it below with an appropriate prefix and tags.
"""

from fastapi import APIRouter

from app.api.routes import health, chat, sessions, models

api_router = APIRouter()

# ── System routes (no prefix – served at / and /health) ──────────
api_router.include_router(health.router)

# ── Domain routes ────────────────────────────────────────────────
api_router.include_router(chat.router,     prefix="/chat",     tags=["Chat"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(models.router,   prefix="/models",   tags=["Models"])
