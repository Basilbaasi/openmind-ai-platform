import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_models(async_client: AsyncClient):
    response = await async_client.get("/models")

    assert response.status_code == 200
    data = response.json()

    assert "models" in data
    assert "total" in data
    assert len(data["models"]) == data["total"]

    if data["total"] > 0:
        first_model = data["models"][0]
        assert "id" in first_model
        assert "name" in first_model
        assert "capabilities" in first_model
        assert "max_context_length" in first_model
