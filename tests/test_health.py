"""
Tests for health and root endpoints.

These are the most critical tests in the suite – they verify the
application boots correctly, serves traffic, and returns the expected
contract for monitoring infrastructure.
"""

import pytest

# ── Root Endpoint Tests ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_root_returns_200(async_client):
    """GET / should return 200 with welcome message."""
    response = await async_client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert "message" in data
    assert "version" in data
    assert "docs_url" in data
    assert data["docs_url"] == "/docs"


@pytest.mark.asyncio
async def test_root_contains_app_name(async_client):
    """GET / message should contain the application name."""
    response = await async_client.get("/")
    data = response.json()
    assert "OpenMind" in data["message"]


@pytest.mark.asyncio
async def test_root_returns_json_content_type(async_client):
    """GET / should return Content-Type: application/json."""
    response = await async_client.get("/")
    assert response.headers["content-type"] == "application/json"


@pytest.mark.asyncio
async def test_root_version_is_semver(async_client):
    """GET / version should follow semantic versioning format."""
    import re

    response = await async_client.get("/")
    data = response.json()
    semver_pattern = r"^\d+\.\d+\.\d+$"
    assert re.match(semver_pattern, data["version"]), (
        f"Version '{data['version']}' does not match semver pattern"
    )


# ── Health Endpoint Tests ────────────────────────────────────────


@pytest.mark.asyncio
async def test_health_returns_200(async_client):
    """GET /health should return 200 with status 'healthy'."""
    response = await async_client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_health_response_schema(async_client):
    """Health response should match the HealthResponse schema exactly."""
    response = await async_client.get("/health")
    data = response.json()

    expected_keys = {"status", "version", "environment", "timestamp"}
    assert set(data.keys()) == expected_keys


@pytest.mark.asyncio
async def test_health_returns_json_content_type(async_client):
    """GET /health should return Content-Type: application/json."""
    response = await async_client.get("/health")
    assert response.headers["content-type"] == "application/json"


@pytest.mark.asyncio
async def test_health_status_is_healthy(async_client):
    """Health status value should be exactly 'healthy'."""
    response = await async_client.get("/health")
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_health_environment_is_valid(async_client):
    """Health environment should be one of the allowed values."""
    response = await async_client.get("/health")
    data = response.json()
    valid_environments = {"development", "staging", "production"}
    assert data["environment"] in valid_environments


@pytest.mark.asyncio
async def test_health_timestamp_is_iso_format(async_client):
    """Health timestamp should be a valid ISO 8601 datetime string."""
    from datetime import datetime

    response = await async_client.get("/health")
    data = response.json()

    # Should not raise ValueError
    parsed = datetime.fromisoformat(data["timestamp"])
    assert parsed is not None


@pytest.mark.asyncio
async def test_health_post_not_allowed(async_client):
    """POST /health should return 405 Method Not Allowed."""
    response = await async_client.post("/health")
    assert response.status_code == 405


@pytest.mark.asyncio
async def test_health_version_matches_root(async_client):
    """Health and root endpoints should report the same version."""
    health_resp = await async_client.get("/health")
    root_resp = await async_client.get("/")

    assert health_resp.json()["version"] == root_resp.json()["version"]


# ── OpenAPI Schema Tests ────────────────────────────────────────


@pytest.mark.asyncio
async def test_openapi_schema_available(async_client):
    """The OpenAPI schema should be served at /openapi.json."""
    response = await async_client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "openapi" in data
    assert "info" in data
    assert data["info"]["title"] == "OpenMind AI Platform"


@pytest.mark.asyncio
async def test_openapi_schema_has_paths(async_client):
    """The OpenAPI schema should list all defined paths."""
    response = await async_client.get("/openapi.json")
    data = response.json()
    assert "/" in data["paths"]
    assert "/health" in data["paths"]


# ── 404 Tests ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_undefined_route_returns_404(async_client):
    """Requesting an undefined path should return 404."""
    response = await async_client.get("/nonexistent")
    assert response.status_code == 404
