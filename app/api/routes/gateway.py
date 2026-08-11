"""
API Gateway routes — OpenAI-compatible endpoints.

Provides /api/v1/chat/completions, /api/v1/models, and /api/v1/embeddings
with Bearer authentication via API keys.
"""

import json
import time

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.api_key_service import ApiKeyService
from app.storage.request_log_repository import RequestLogRepository

router = APIRouter()


async def validate_bearer_token(request: Request, session: AsyncSession = Depends(get_db)) -> str:
    """Dependency that validates the Bearer token from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected: Bearer <api_key>",
        )
    token = auth_header[7:]
    service = ApiKeyService(session)
    valid = await service.validate_key(token)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key.",
        )
    return token


@router.get("/models", summary="List models (OpenAI-compatible)")
async def gateway_models(
    _token: str = Depends(validate_bearer_token),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """OpenAI-compatible model listing."""
    from app.services.model_service import ModelService

    service = ModelService(session)
    models = await service.list_models()
    return {
        "object": "list",
        "data": [
            {
                "id": m.id,
                "object": "model",
                "created": 0,
                "owned_by": m.provider,
            }
            for m in models
        ],
    }


@router.post("/chat/completions", summary="Chat completions (OpenAI-compatible)")
async def gateway_chat(
    request: Request,
    _token: str = Depends(validate_bearer_token),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """OpenAI-compatible chat completion endpoint with request logging."""
    start_time = time.time()
    body = await request.json()
    headers_dict = dict(request.headers)

    from app.schemas.chat import ChatMessage, ChatRequest, RoleEnum
    from app.services.chat_service import ChatService

    # Build ChatRequest from OpenAI-format body
    messages = [
        ChatMessage(role=RoleEnum(m["role"]), content=m["content"])
        for m in body.get("messages", [])
    ]
    chat_request = ChatRequest(
        messages=messages,
        model=body.get("model", "default"),
        temperature=body.get("temperature", 0.7),
        max_tokens=body.get("max_tokens"),
    )

    service = ChatService(session)
    response = await service.generate_response(chat_request)

    elapsed_ms = int((time.time() - start_time) * 1000)
    response_body = response.model_dump_json()

    # Log the request
    log_repo = RequestLogRepository(session)
    await log_repo.create(
        method="POST",
        url="/api/v1/chat/completions",
        status=200,
        time_ms=elapsed_ms,
        size_bytes=len(response_body),
        request_headers=json.dumps(
            {k: v for k, v in headers_dict.items() if k.lower() != "authorization"}
        ),
        request_body=json.dumps(body),
        response_body=response_body,
    )

    # Return in OpenAI format
    return {
        "id": response.id,
        "object": "chat.completion",
        "created": response.created,
        "model": response.model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": response.message.role.value,
                    "content": response.message.content,
                },
                "finish_reason": response.finish_reason,
            }
        ],
        "usage": response.usage.model_dump(),
    }


@router.post("/embeddings", summary="Generate embeddings (OpenAI-compatible)")
async def gateway_embeddings(
    request: Request,
    _token: str = Depends(validate_bearer_token),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """OpenAI-compatible embeddings endpoint (placeholder)."""
    body = await request.json()
    input_text = body.get("input", "")

    # For now, return a placeholder embedding
    # TODO: Integrate with Gemini embedding API
    return {
        "object": "list",
        "data": [
            {
                "object": "embedding",
                "index": 0,
                "embedding": [0.0] * 1024,
            }
        ],
        "model": body.get("model", "bge-large-en-v1.5"),
        "usage": {
            "prompt_tokens": len(str(input_text).split()),
            "total_tokens": len(str(input_text).split()),
        },
    }
