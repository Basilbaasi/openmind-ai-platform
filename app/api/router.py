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

from app.api.routes import (
    api_keys,
    benchmarks,
    chat,
    gateway,
    health,
    knowledge,
    logs,
    memory,
    models,
    monitoring,
    sessions,
    settings,
    workflows,
)

api_router = APIRouter()

# ── System routes (no prefix – served at / and /health) ──────────
api_router.include_router(health.router)

# ── Domain routes ────────────────────────────────────────────────
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(models.router, prefix="/models", tags=["Models"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])
api_router.include_router(memory.router, prefix="/memory", tags=["Memory"])
api_router.include_router(logs.router, prefix="/logs", tags=["Logs"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(benchmarks.router, prefix="/benchmarks", tags=["Benchmarks"])
api_router.include_router(api_keys.router, prefix="/api-keys", tags=["API Keys"])

# ── Monitoring ───────────────────────────────────────────────────
api_router.include_router(monitoring.router, prefix="/api/status", tags=["Monitoring"])

# ── API Gateway (OpenAI-compatible) ──────────────────────────────
api_router.include_router(gateway.router, prefix="/api/v1", tags=["API Gateway"])
