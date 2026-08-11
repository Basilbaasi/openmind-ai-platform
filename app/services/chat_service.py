"""
Chat service — Generic model adapter execution.

Routes chat requests through per-model Python adapter code.
Each model has its own execution code with standardized variable names.
No hardcoded provider (Gemini, OpenAI, etc.) — all models go through adapters.
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.model_adapters.executor import execute_model_adapter
from app.schemas.chat import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ChatStreamResponse,
    RoleEnum,
    TokenUsage,
)
from app.services.model_service import ModelService
from app.storage.session_repository import MessageRepository

logger = get_logger(__name__)


class ChatService:
    """
    Service responsible for handling chat completions.
    Routes requests through per-model adapter code — no hardcoded providers.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.db_session = session
        self.msg_repo = MessageRepository(session)
        self.model_service = ModelService(session)

    def _estimate_tokens(self, text: str) -> int:
        return int(len(text.split()) * 1.3)

    async def generate_response(self, request: ChatRequest) -> ChatResponse:
        """
        Generates a chat response by executing the model's adapter code.
        Persists messages to the database if a session_id is provided.
        """
        response_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
        created = int(datetime.now(UTC).timestamp())

        # Persist user message if session is provided
        if request.session_id:
            last_user_msg = request.messages[-1] if request.messages else None
            if last_user_msg and last_user_msg.role == RoleEnum.user:
                await self.msg_repo.create(
                    session_id=request.session_id,
                    role="user",
                    content=last_user_msg.content,
                )

        # Look up the model's adapter code and API key from the DB
        content = await self._execute_adapter(request)

        # Calculate token usage estimate
        prompt_text = " ".join([m.content for m in request.messages])
        prompt_tokens = self._estimate_tokens(prompt_text)
        comp_tokens = self._estimate_tokens(content)
        usage = TokenUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=comp_tokens,
            total_tokens=prompt_tokens + comp_tokens,
        )

        # Persist assistant response if session is provided
        if request.session_id:
            await self.msg_repo.create(
                session_id=request.session_id,
                role="assistant",
                content=content,
            )

        return ChatResponse(
            id=response_id,
            object="chat.completion",
            created=created,
            model=request.model,
            message=ChatMessage(role=RoleEnum.assistant, content=content),
            finish_reason="stop",
            usage=usage,
            session_id=request.session_id,
        )

    async def stream_response(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """
        Streams a chat response via SSE.
        Executes the model's adapter code and streams printed chunks in real-time.
        """
        import asyncio

        from app.model_adapters.executor import (
            execute_model_adapter_stream,
            extract_text_from_chunk,
            get_model_api_key,
            get_saved_adapter_code,
        )

        response_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
        created = int(datetime.now(UTC).timestamp())

        # Do not write before or during a stream.  With SQLite, an uncommitted
        # write transaction lasts for the whole provider request and blocks
        # later chat requests.  Both messages are stored after [DONE].
        last_user_msg = request.messages[-1] if request.messages else None
        user_msg_time = datetime.now(UTC)  # capture when the user request arrived

        # Look up model record
        model_record = await self.model_service.get_model_record(request.model)
        if model_record is None:
            stream_chunk = ChatStreamResponse(
                id=response_id,
                object="chat.completion.chunk",
                created=created,
                model=request.model,
                chunk=f"Error: Model '{request.model}' not found in the registry.",
                finish_reason="stop",
                session_id=request.session_id,
            )
            yield f"data: {stream_chunk.model_dump_json(exclude_none=True)}\n\n"
            yield "data: [DONE]\n\n"
            return

        # The saved file is the deployed adapter.  Fall back to the database
        # record for legacy models that predate adapter-file persistence.
        adapter_code = get_saved_adapter_code(model_record.id) or model_record.adapter_code or ""
        api_key = get_model_api_key(model_record.id) or model_record.model_api_key or ""

        if not adapter_code.strip():
            stream_chunk = ChatStreamResponse(
                id=response_id,
                object="chat.completion.chunk",
                created=created,
                model=request.model,
                chunk=f"Error: Model '{model_record.name}' has no adapter code configured.",
                finish_reason="stop",
                session_id=request.session_id,
            )
            yield f"data: {stream_chunk.model_dump_json(exclude_none=True)}\n\n"
            yield "data: [DONE]\n\n"
            return

        messages_list = [
            {
                "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
                "content": msg.content,
            }
            for msg in request.messages
        ]
        # Preserve the instruction and recent turns without allowing an
        # unbounded browser history to exceed the provider context window.
        system_messages = [message for message in messages_list if message["role"] == "system"]
        conversation_messages = [
            message for message in messages_list if message["role"] != "system"
        ]
        messages_list = system_messages[-1:] + conversation_messages[-20:]

        logger.info(
            "streaming_adapter_execution",
            model_id=request.model,
            model_name=model_record.name,
            message_count=len(messages_list),
        )

        # Run stream executor
        generator = execute_model_adapter_stream(
            adapter_code=adapter_code,
            api_key=api_key,
            messages=messages_list,
            temperature=request.temperature,
            max_tokens=request.max_tokens or 1024,
            top_p=request.top_p,
        )

        full_response_content = ""
        # The adapter uses blocking requests in a worker thread. Consume its
        # queue-backed iterator away from the event loop so each event can be
        # promptly flushed as SSE.
        while True:
            raw_chunk = await asyncio.to_thread(next, generator, None)
            if raw_chunk is None:
                break

            text_delta = extract_text_from_chunk(raw_chunk)
            if not text_delta:
                continue

            full_response_content += text_delta

            stream_chunk = ChatStreamResponse(
                id=response_id,
                object="chat.completion.chunk",
                created=created,
                model=request.model,
                chunk=text_delta,
                finish_reason=None,
                session_id=request.session_id,
            )
            yield f"data: {stream_chunk.model_dump_json(exclude_none=True)}\n\n"
            await asyncio.sleep(0.005)

        # Send final chunk with stop finish reason
        stream_chunk = ChatStreamResponse(
            id=response_id,
            object="chat.completion.chunk",
            created=created,
            model=request.model,
            chunk="",
            finish_reason="stop",
            session_id=request.session_id,
        )
        yield f"data: {stream_chunk.model_dump_json(exclude_none=True)}\n\n"

        # Mark the client stream complete before doing database work.  Saving
        # the final user/assistant pair then cannot delay visible tokens.
        yield "data: [DONE]\n\n"

        assistant_msg_time = datetime.now(UTC)  # capture when the stream completed

        # Persist one completed exchange after the stream.  This avoids partial
        # assistant messages and leaves a clean conversation history.
        #
        # IMPORTANT: The original request-scoped DB session (from get_db
        # dependency) is committed and closed by FastAPI *before* the
        # StreamingResponse generator starts executing.  We must open a
        # fresh, independent session here so the INSERT + COMMIT actually
        # reaches PostgreSQL.
        #
        # We explicitly set created_at on each message because PostgreSQL's
        # now() returns the transaction-start time — both INSERTs would get
        # the same timestamp, causing undefined sort order on reload.
        if request.session_id and full_response_content:
            from app.core.database import async_session_factory
            from app.storage.session_repository import MessageRepository as _MsgRepo

            async with async_session_factory() as persist_session:
                try:
                    persist_repo = _MsgRepo(persist_session)
                    if last_user_msg and last_user_msg.role == RoleEnum.user:
                        await persist_repo.create(
                            session_id=request.session_id,
                            role="user",
                            content=last_user_msg.content,
                            created_at=user_msg_time,
                            updated_at=user_msg_time,
                        )
                    await persist_repo.create(
                        session_id=request.session_id,
                        role="assistant",
                        content=full_response_content,
                        created_at=assistant_msg_time,
                        updated_at=assistant_msg_time,
                    )
                    await persist_session.commit()
                except Exception as exc:
                    await persist_session.rollback()
                    logger.error(
                        "stream_persist_failed",
                        session_id=request.session_id,
                        error=str(exc),
                    )

    async def _execute_adapter(self, request: ChatRequest) -> str:
        """
        Look up the model's adapter code and API key, then execute.
        """
        model_record = await self.model_service.get_model_record(request.model)

        if model_record is None:
            logger.warning("model_not_found", model_id=request.model)
            return (
                f"Error: Model '{request.model}' not found in the registry. "
                "Please add the model with its adapter code via the Models page."
            )

        from app.model_adapters.executor import get_model_api_key, get_saved_adapter_code

        adapter_code = get_saved_adapter_code(model_record.id) or model_record.adapter_code or ""
        api_key = get_model_api_key(model_record.id) or model_record.model_api_key or ""

        if not adapter_code.strip():
            return (
                f"Error: Model '{model_record.name}' has no adapter code configured. "
                "Please add provider code in the model settings."
            )

        # Build messages list in the format adapters expect
        messages_list = [
            {
                "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
                "content": msg.content,
            }
            for msg in request.messages
        ]

        logger.info(
            "executing_adapter",
            model_id=request.model,
            model_name=model_record.name,
            message_count=len(messages_list),
        )

        # Execute the adapter code with injected variables
        try:
            content = execute_model_adapter(
                adapter_code=adapter_code,
                api_key=api_key,
                messages=messages_list,
                temperature=request.temperature,
                max_tokens=request.max_tokens or 1024,
                top_p=request.top_p,
            )
        except Exception as e:
            logger.error("adapter_execution_error", error=str(e), model_id=request.model)
            content = f"Error executing adapter for model '{model_record.name}': {e!s}"

        return content
