import uuid
import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator

from app.schemas.chat import (
    ChatRequest, 
    ChatResponse, 
    ChatStreamResponse, 
    ChatMessage, 
    RoleEnum, 
    TokenUsage
)

class ChatService:
    """
    Service responsible for handling chat completions and streaming.
    Currently returns deterministic mock responses.
    """
    
    async def generate_response(self, request: ChatRequest) -> ChatResponse:
        """
        Simulates a blocking chat completion request.
        """
        # Simulate processing time
        await asyncio.sleep(0.5)
        
        response_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
        created = int(datetime.now(timezone.utc).timestamp())
        
        return ChatResponse(
            id=response_id,
            object="chat.completion",
            created=created,
            model=request.model,
            message=ChatMessage(
                role=RoleEnum.assistant,
                content="This is a deterministic mock response from the ChatService."
            ),
            finish_reason="stop",
            usage=TokenUsage(prompt_tokens=10, completion_tokens=12, total_tokens=22),
            session_id=request.session_id
        )
        
    async def stream_response(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """
        Simulates an asynchronous streaming chat completion request.
        Yields Server-Sent Events (SSE) strings.
        """
        response_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
        created = int(datetime.now(timezone.utc).timestamp())
        
        chunks = [
            "This ", "is ", "a ", "deterministic ", "mock ", 
            "stream ", "response ", "from ", "the ", "ChatService."
        ]
        
        for i, chunk_text in enumerate(chunks):
            # Simulate generation time per token
            await asyncio.sleep(0.1)
            
            finish_reason = "stop" if i == len(chunks) - 1 else None
            
            chunk_obj = ChatStreamResponse(
                id=response_id,
                object="chat.completion.chunk",
                created=created,
                model=request.model,
                chunk=chunk_text,
                finish_reason=finish_reason,
                session_id=request.session_id
            )
            
            # SSE format: data: {json}\n\n
            yield f"data: {chunk_obj.model_dump_json(exclude_none=True)}\n\n"
            
        yield "data: [DONE]\n\n"

# Dependency provider for FastAPI
def get_chat_service() -> ChatService:
    return ChatService()
