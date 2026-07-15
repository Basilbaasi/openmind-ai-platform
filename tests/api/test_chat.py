import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_generate_chat(async_client: AsyncClient):
    payload = {"messages": [{"role": "user", "content": "Hello!"}], "model": "test-model"}
    response = await async_client.post("/chat", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert data["object"] == "chat.completion"
    assert data["model"] == "test-model"
    assert "message" in data
    assert data["message"]["role"] == "assistant"
    assert (
        data["message"]["content"] == "This is a deterministic mock response from the ChatService."
    )
    assert "usage" in data


@pytest.mark.asyncio
async def test_stream_chat(async_client: AsyncClient):
    payload = {"messages": [{"role": "user", "content": "Stream this"}], "model": "test-model"}

    # We use stream=True context manager for httpx
    async with async_client.stream("POST", "/chat/stream", json=payload) as response:
        assert response.status_code == 200

        # Read the first few bytes to verify it's an SSE stream
        chunks = []
        async for chunk in response.aiter_text():
            chunks.append(chunk)

        full_text = "".join(chunks)
        assert "data: {" in full_text
        assert "chat.completion.chunk" in full_text
        assert "data: [DONE]" in full_text


@pytest.mark.asyncio
async def test_chat_validation_error(async_client: AsyncClient):
    # Missing required 'messages' field
    payload = {"model": "test-model"}
    response = await async_client.post("/chat", json=payload)

    assert response.status_code == 422
    data = response.json()

    # Verify our custom APIError format
    assert data["error_type"] == "validation_error"
    assert "details" in data
