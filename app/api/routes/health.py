"""
Health and root API routes.

Provides fundamental observability endpoints that load balancers,
orchestrators (Kubernetes), and monitoring tools rely on.
"""

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.health import HealthResponse, RootResponse

router = APIRouter(tags=["System"])


@router.get(
    "/",
    response_model=RootResponse,
    summary="Root endpoint",
    description="Returns basic information about the API and a link to documentation.",
)
async def root() -> RootResponse:
    """Welcome / discovery endpoint."""
    settings = get_settings()
    return RootResponse(
        message=f"Welcome to {settings.APP_NAME}",
        version=settings.APP_VERSION,
        docs_url="/docs",
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description=(
        "Returns the current health status of the service. "
        "Used by load balancers and container orchestrators for liveness probes."
    ),
)
async def health_check() -> HealthResponse:
    """
    Lightweight health probe.

    Future phases will extend this to check downstream dependencies
    (database connectivity, cache availability, LLM provider reachability).
    """
    settings = get_settings()
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )
