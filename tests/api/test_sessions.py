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
    assert "metadata" in data


@pytest.mark.asyncio
async def test_list_sessions(async_client: AsyncClient):
    response = await async_client.get("/sessions")

    assert response.status_code == 200
    data = response.json()

    assert "sessions" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_delete_session(async_client: AsyncClient):
    create_resp = await async_client.post("/sessions", json={"title": "To Delete"})
    session_id = create_resp.json()["id"]

    response = await async_client.delete(f"/sessions/{session_id}")
    assert response.status_code == 204
