"""
OpenMind AI Platform – FastAPI Application Factory.

This is the entry point of the application. It constructs the FastAPI
instance, wires up middleware, and mounts all routers. The application
is created via a factory function so it can be imported cleanly by
Uvicorn, test fixtures, and ASGI servers alike.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.errors import add_exception_handlers
from app.core.config import get_settings
from app.core.lifespan import lifespan


def create_application() -> FastAPI:
    """
    Application factory.

    Constructs a fully configured FastAPI instance. Keeping this as a
    callable factory (rather than module-level instantiation) gives us:

    - Testability: tests can create fresh app instances per suite.
    - Flexibility: ASGI servers can import and call this directly.
    - Clarity: all wiring is explicit and in one place.
    """
    settings = get_settings()

    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=settings.APP_DESCRIPTION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── Middleware ────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ──────────────────────────────────────────────────────
    application.include_router(api_router)

    # ── Exception Handlers ───────────────────────────────────────────
    add_exception_handlers(application)

    return application


# Module-level instance used by `uvicorn app.main:app`
app = create_application()
