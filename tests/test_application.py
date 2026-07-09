"""
Tests for the application factory and lifecycle.

Verifies that create_application() produces a correctly configured
FastAPI instance with the expected middleware, routers, and metadata.
"""

import pytest
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.main import create_application


class TestCreateApplication:
    """Test the application factory function."""

    def test_returns_fastapi_instance(self):
        """create_application() should return a FastAPI instance."""
        app = create_application()
        assert isinstance(app, FastAPI)

    def test_app_title_matches_settings(self):
        """Application title should match the configured APP_NAME."""
        app = create_application()
        settings = get_settings()
        assert app.title == settings.APP_NAME

    def test_app_version_matches_settings(self):
        """Application version should match the configured APP_VERSION."""
        app = create_application()
        settings = get_settings()
        assert app.version == settings.APP_VERSION

    def test_app_description_matches_settings(self):
        """Application description should match the configured APP_DESCRIPTION."""
        app = create_application()
        settings = get_settings()
        assert app.description == settings.APP_DESCRIPTION

    def test_docs_url_configured(self):
        """Swagger docs should be available at /docs."""
        app = create_application()
        assert app.docs_url == "/docs"

    def test_redoc_url_configured(self):
        """ReDoc should be available at /redoc."""
        app = create_application()
        assert app.redoc_url == "/redoc"

    def test_openapi_url_configured(self):
        """OpenAPI schema should be available at /openapi.json."""
        app = create_application()
        assert app.openapi_url == "/openapi.json"

    def test_cors_middleware_present(self):
        """Application should have CORS middleware configured."""
        app = create_application()
        middleware_classes = [m.cls for m in app.user_middleware]
        assert CORSMiddleware in middleware_classes

    def test_routes_registered(self):
        """Application should have routes registered."""
        app = create_application()
        paths = [route.path for route in app.routes]
        assert "/" in paths
        assert "/health" in paths


class TestApplicationLifespan:
    """Test the application lifespan context manager."""

    @pytest.mark.asyncio
    async def test_lifespan_executes_without_error(self):
        """The lifespan context manager should start and stop cleanly."""
        from app.core.lifespan import lifespan

        app = create_application()
        async with lifespan(app):
            # If we reach here, startup succeeded
            pass
        # If we reach here, shutdown succeeded

    @pytest.mark.asyncio
    async def test_app_serves_after_startup(self, async_client):
        """Application should serve requests after startup."""
        response = await async_client.get("/health")
        assert response.status_code == 200


class TestApplicationIsolation:
    """Test that multiple app instances are independent."""

    def test_factory_creates_new_instances(self):
        """Each call to create_application() should return a new instance."""
        app1 = create_application()
        app2 = create_application()
        assert app1 is not app2

    def test_instances_have_same_config(self):
        """Different app instances should share the same configuration."""
        app1 = create_application()
        app2 = create_application()
        assert app1.title == app2.title
        assert app1.version == app2.version
