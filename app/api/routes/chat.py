from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService, get_chat_service

router = APIRouter()


@router.post(
    "",
    response_model=ChatResponse,
    summary="Generate a chat response",
    description="Returns a full generated message (blocking request).",
)
async def generate_chat(
    request: ChatRequest, service: ChatService = Depends(get_chat_service)
) -> ChatResponse:
    """POST /chat endpoint."""
    return await service.generate_response(request)


@router.post(
    "/stream",
    summary="Stream a chat response",
    description="Returns a Server-Sent Events (SSE) stream of generated chunks.",
)
async def stream_chat(
    request: ChatRequest, service: ChatService = Depends(get_chat_service)
) -> StreamingResponse:
    """POST /chat/stream endpoint."""
    return StreamingResponse(service.stream_response(request), media_type="text/event-stream")
