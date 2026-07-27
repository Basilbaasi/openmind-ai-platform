import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.schemas.chat import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ChatStreamResponse,
    RoleEnum,
    TokenUsage,
)
from app.storage.session_repository import MessageRepository

logger = get_logger(__name__)


class ChatService:
    """
    Service responsible for handling chat completions and streaming.
    Integrates with Google Gemini for real AI responses.
    Falls back to mock responses if GEMINI_API_KEY is not set.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.db_session = session
        self.msg_repo = MessageRepository(session)
        self.settings = get_settings()

    def _get_gemini_model_name(self, model_id: str) -> str:
        if model_id and "gemini" in model_id.lower():
            return model_id
        return "gemini-2.0-flash"

    def _estimate_tokens(self, text: str) -> int:
        return int(len(text.split()) * 1.3)

    async def generate_response(self, request: ChatRequest) -> ChatResponse:
        """
        Generates a chat response, using Gemini if configured.
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

        # Try Gemini, fall back to mock
        content, usage = await self._call_gemini(request)

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
        Uses Gemini streaming if configured, otherwise mock chunks.
        """
        response_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
        created = int(datetime.now(UTC).timestamp())
        target_model = self._get_gemini_model_name(request.model)

        # Persist user message
        if request.session_id:
            last_user_msg = request.messages[-1] if request.messages else None
            if last_user_msg and last_user_msg.role == RoleEnum.user:
                await self.msg_repo.create(
                    session_id=request.session_id,
                    role="user",
                    content=last_user_msg.content,
                )

        full_response = ""

        if self.settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai

                genai.configure(api_key=self.settings.GEMINI_API_KEY)
                model = genai.GenerativeModel(target_model)

                # Build message history for Gemini
                contents = []
                system_instruction = None
                for msg in request.messages:
                    if msg.role == RoleEnum.system:
                        system_instruction = msg.content
                    elif msg.role == RoleEnum.user:
                        contents.append({"role": "user", "parts": [msg.content]})
                    elif msg.role == RoleEnum.assistant:
                        contents.append({"role": "model", "parts": [msg.content]})

                if system_instruction:
                    model = genai.GenerativeModel(
                        target_model,
                        system_instruction=system_instruction,
                    )

                response = model.generate_content(
                    contents,
                    generation_config=genai.types.GenerationConfig(
                        temperature=request.temperature,
                        max_output_tokens=request.max_tokens,
                    ),
                    stream=True,
                )

                for chunk in response:
                    if chunk.text:
                        full_response += chunk.text
                        stream_chunk = ChatStreamResponse(
                            id=response_id,
                            object="chat.completion.chunk",
                            created=created,
                            model=request.model,
                            chunk=chunk.text,
                            finish_reason=None,
                            session_id=request.session_id,
                        )
                        yield f"data: {stream_chunk.model_dump_json(exclude_none=True)}\n\n"

            except Exception as e:
                logger.error("gemini_stream_error", error=str(e))
                error_chunk = ChatStreamResponse(
                    id=response_id,
                    object="chat.completion.chunk",
                    created=created,
                    model=request.model,
                    chunk=f"Error: {e!s}",
                    finish_reason="error",
                    session_id=request.session_id,
                )
                yield f"data: {error_chunk.model_dump_json(exclude_none=True)}\n\n"
                full_response = f"Error: {e!s}"
        else:
            # Mock streaming fallback
            import asyncio

            mock_text = "This is a response from the OpenMind AI Platform. Configure your GEMINI_API_KEY in .env to enable real AI responses."
            words = mock_text.split(" ")
            for i, word in enumerate(words):
                chunk_text = word + (" " if i < len(words) - 1 else "")
                full_response += chunk_text
                await asyncio.sleep(0.05)
                stream_chunk = ChatStreamResponse(
                    id=response_id,
                    object="chat.completion.chunk",
                    created=created,
                    model=request.model,
                    chunk=chunk_text,
                    finish_reason=None if i < len(words) - 1 else "stop",
                    session_id=request.session_id,
                )
                yield f"data: {stream_chunk.model_dump_json(exclude_none=True)}\n\n"

        # Persist assistant response
        if request.session_id and full_response:
            await self.msg_repo.create(
                session_id=request.session_id,
                role="assistant",
                content=full_response,
            )

        yield "data: [DONE]\n\n"

    async def _call_gemini(self, request: ChatRequest) -> tuple[str, TokenUsage]:
        """Call Gemini API for a non-streaming response."""
        target_model = self._get_gemini_model_name(request.model)
        prompt_text = " ".join([m.content for m in request.messages])

        if not self.settings.GEMINI_API_KEY:
            res_text = "This is a response from the OpenMind AI Platform. Configure your GEMINI_API_KEY in .env to enable real AI responses."
            prompt_tokens = self._estimate_tokens(prompt_text)
            comp_tokens = self._estimate_tokens(res_text)
            return res_text, TokenUsage(
                prompt_tokens=prompt_tokens,
                completion_tokens=comp_tokens,
                total_tokens=prompt_tokens + comp_tokens,
            )

        try:
            import google.generativeai as genai

            genai.configure(api_key=self.settings.GEMINI_API_KEY)

            system_instruction = None
            contents = []
            for msg in request.messages:
                if msg.role == RoleEnum.system:
                    system_instruction = msg.content
                elif msg.role == RoleEnum.user:
                    contents.append({"role": "user", "parts": [msg.content]})
                elif msg.role == RoleEnum.assistant:
                    contents.append({"role": "model", "parts": [msg.content]})

            model = genai.GenerativeModel(
                target_model,
                system_instruction=system_instruction,
            )

            response = model.generate_content(
                contents,
                generation_config=genai.types.GenerationConfig(
                    temperature=request.temperature,
                    max_output_tokens=request.max_tokens,
                ),
            )
            text = response.text or "No response received."
            prompt_tokens = self._estimate_tokens(prompt_text)
            comp_tokens = self._estimate_tokens(text)
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                prompt_tokens = getattr(response.usage_metadata, "prompt_token_count", prompt_tokens)
                comp_tokens = getattr(response.usage_metadata, "candidates_token_count", comp_tokens)

            return text, TokenUsage(
                prompt_tokens=prompt_tokens,
                completion_tokens=comp_tokens,
                total_tokens=prompt_tokens + comp_tokens,
            )

        except Exception as e:
            logger.error("gemini_api_error", error=str(e))
            err_text = f"Error communicating with Gemini: {e!s}"
            return err_text, TokenUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0)



