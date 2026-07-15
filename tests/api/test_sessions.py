import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_session(async_client: AsyncClient):
    payload = {"title": "Test Session", "metadata": {"test": True}}
    response = await async_client.post("/sessions", json=payload)

    assert response.status_code == 201
    data = response.json()

    assert "id" in data
    assert data["title"] == "Test Session"
    assert data["metadata"] == {"test": True}


@pytest.mark.asyncio
async def test_list_sessions(async_client: AsyncClient):
    response = await async_client.get("/sessions")

    assert response.status_code == 200
    data = response.json()

    assert "sessions" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_delete_session(async_client: AsyncClient):
    # Our mock service always returns True for delete
    response = await async_client.delete("/sessions/mock-id")
    assert response.status_code == 204
