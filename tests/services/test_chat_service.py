import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.model_adapters.executor import extract_text_from_chunk
from app.models.model import ModelRecord
from app.schemas.chat import ChatMessage, ChatRequest, RoleEnum
from app.services.chat_service import ChatService


def test_stream_parser_excludes_reasoning_and_reads_content():
    reasoning = 'data: {"choices":[{"delta":{"reasoning_content":"private plan"}}]}'
    content = 'data: {"choices":[{"delta":{"content":"visible answer"}}]}'

    assert extract_text_from_chunk(reasoning) == ""
    assert extract_text_from_chunk(content) == "visible answer"


@pytest.mark.asyncio
async def test_chat_service_generate():
    mock_session = MagicMock()
    service = ChatService(session=mock_session)

    dummy_model = ModelRecord(
        id="test-model",
        name="Test Model",
        provider="Cloud",
        type="text",
        adapter_code='response_text = "Mocked Response"',
        model_api_key="test-key",
    )
    service.model_service.get_model_record = AsyncMock(return_value=dummy_model)

    request = ChatRequest(
        messages=[ChatMessage(role=RoleEnum.user, content="Hello")], model="test-model"
    )

    response = await service.generate_response(request)

    assert response.model == "test-model"
    assert response.message.role == RoleEnum.assistant
    assert response.message.content == "Mocked Response"
    assert response.usage.total_tokens >= 0
    assert response.object == "chat.completion"


@pytest.mark.asyncio
async def test_chat_service_stream():
    mock_session = MagicMock()
    service = ChatService(session=mock_session)

    dummy_model = ModelRecord(
        id="test-model",
        name="Test Model",
        provider="Cloud",
        type="text",
        adapter_code='response_text = "Mocked Response"',
        model_api_key="test-key",
    )
    service.model_service.get_model_record = AsyncMock(return_value=dummy_model)

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
