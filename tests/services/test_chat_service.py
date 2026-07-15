import json

import pytest

from app.schemas.chat import ChatMessage, ChatRequest, RoleEnum
from app.services.chat_service import ChatService


@pytest.mark.asyncio
async def test_chat_service_generate():
    service = ChatService()
    request = ChatRequest(
        messages=[ChatMessage(role=RoleEnum.user, content="Hello")], model="test-model"
    )

    response = await service.generate_response(request)

    assert response.model == "test-model"
    assert response.message.role == RoleEnum.assistant
    assert response.usage.total_tokens > 0
    assert response.object == "chat.completion"


@pytest.mark.asyncio
async def test_chat_service_stream():
    service = ChatService()
    request = ChatRequest(
        messages=[ChatMessage(role=RoleEnum.user, content="Stream")], model="test-model"
    )

    chunks = []
    async for chunk_str in service.stream_response(request):
        chunks.append(chunk_str)

    assert len(chunks) > 0
    assert chunks[-1] == "data: [DONE]\n\n"

    # Parse the first JSON chunk
    first_data = chunks[0].replace("data: ", "").strip()
    first_obj = json.loads(first_data)

    assert first_obj["model"] == "test-model"
    assert "chunk" in first_obj
    assert first_obj["object"] == "chat.completion.chunk"
