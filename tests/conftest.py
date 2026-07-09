"""
Shared test fixtures.

The async_client fixture provides an HTTPX AsyncClient wired to the
FastAPI test application, enabling end-to-end route testing without
starting a real server.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_application


@pytest.fixture
def app():
    """Create a fresh FastAPI application for each test session."""
    return create_application()


@pytest.fixture
async def async_client(app):
    """
    Async HTTP client bound to the test application.

    Usage:
        async def test_health(async_client):
            response = await async_client.get("/health")
            assert response.status_code == 200
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
