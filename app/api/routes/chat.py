from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService

router = APIRouter()


async def get_chat_service(session: AsyncSession = Depends(get_db)) -> ChatService:
    return ChatService(session)


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
