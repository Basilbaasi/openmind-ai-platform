"""
Health and system response schemas.

Defines Pydantic models for the health-check and root endpoints.
Keeping schemas separate from route handlers ensures a clean contract
and makes it easy to version or extend responses later.
"""

from datetime import UTC, datetime

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Response model for the GET /health endpoint."""

    status: str = Field(
        default="healthy",
        description="Current health status of the service.",
        examples=["healthy"],
    )
    version: str = Field(
        description="Semantic version of the running application.",
        examples=["0.1.0"],
    )
    environment: str = Field(
        description="Deployment environment.",
        examples=["development"],
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="UTC timestamp of the health check.",
    )


class RootResponse(BaseModel):
    """Response model for the GET / endpoint."""

    message: str = Field(
        description="Welcome message.",
        examples=["Welcome to OpenMind AI Platform"],
    )
    version: str = Field(
        description="Semantic version of the running application.",
        examples=["0.1.0"],
    )
    docs_url: str = Field(
        description="URL path to the interactive API documentation.",
        examples=["/docs"],
    )
