import os

# Force an in-memory SQLite database for all tests to ensure isolation and speed
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_application


@pytest.fixture
def app():
    """Create a fresh FastAPI application for each test session."""
    return create_application()


@pytest.fixture(autouse=True)
async def init_db():
    """Initialize database tables before each test and clean them up after."""
    import app.models  # noqa: F401
    from app.core.database import engine
    from app.models.base import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


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
