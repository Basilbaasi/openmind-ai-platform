from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.session import MessageRecord, SessionRecord
from app.schemas.sessions import SessionCreateRequest, SessionResponse, MessageResponse
from app.storage.session_repository import MessageRepository, SessionRepository


class SessionService:
    """
    Service responsible for managing chat sessions.
    Now backed by real database persistence.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.repo = SessionRepository(session)
        self.msg_repo = MessageRepository(session)

    async def create_session(self, request: SessionCreateRequest) -> SessionResponse:
        """Creates a new session in the database."""
        record = await self.repo.create(
            title=request.title or "New Conversation",
            model_id=request.metadata.get("model_id", "default") if request.metadata else "default",
            temperature=request.metadata.get("temperature", 0.7) if request.metadata else 0.7,
            max_tokens=request.metadata.get("max_tokens", 1024) if request.metadata else 1024,
            top_p=request.metadata.get("top_p", 0.9) if request.metadata else 0.9,
            presence_penalty=request.metadata.get("presence_penalty", 0.0) if request.metadata else 0.0,
            json_mode=request.metadata.get("json_mode", False) if request.metadata else False,
        )
        return self._to_response(record)

    async def list_sessions(self) -> list[SessionResponse]:
        """Retrieves all sessions from the database."""
        records = await self.repo.get_all_with_messages(limit=100)
        return [self._to_response(r) for r in records]

    async def get_session(self, session_id: str) -> SessionResponse | None:
        """Retrieves a single session with its messages."""
        record = await self.repo.get_with_messages(session_id)
        if record is None:
            return None
        return self._to_response(record)

    async def delete_session(self, session_id: str) -> bool:
        """Deletes a session and its messages (cascade)."""
        return await self.repo.delete(session_id)

    async def update_session_params(self, session_id: str, params: dict) -> SessionResponse | None:
        """Updates session parameters (temperature, etc.)."""
        record = await self.repo.update(session_id, **params)
        if record is None:
            return None
        return self._to_response(record)

    async def add_message(self, session_id: str, role: str, content: str) -> dict:
        """Adds a message to a session."""
        record = await self.msg_repo.create(
            session_id=session_id,
            role=role,
            content=content,
        )
        return {
            "id": record.id,
            "session_id": record.session_id,
            "role": record.role,
            "content": record.content,
            "timestamp": record.created_at.isoformat() if record.created_at else "",
        }

    async def get_messages(self, session_id: str) -> list[dict]:
        """Retrieves all messages for a session."""
        records = await self.msg_repo.get_by_session(session_id)
        return [
            {
                "id": r.id,
                "session_id": r.session_id,
                "role": r.role,
                "content": r.content,
                "timestamp": r.created_at.isoformat() if r.created_at else "",
            }
            for r in records
        ]

    @staticmethod
    def _to_response(record: SessionRecord) -> SessionResponse:
        # Build message list from eagerly loaded relationship (if present)
        messages: list[MessageResponse] = []
        try:
            for m in record.messages:
                messages.append(
                    MessageResponse(
                        id=m.id,
                        session_id=m.session_id,
                        role=m.role,
                        content=m.content,
                        timestamp=m.created_at.isoformat() if m.created_at else "",
                    )
                )
        except Exception:
            # messages relationship not loaded — leave empty
            pass

        return SessionResponse(
            id=record.id,
            title=record.title,
            created_at=record.created_at or datetime.now(UTC),
            updated_at=record.updated_at or datetime.now(UTC),
            metadata={
                "model_id": record.model_id,
                "temperature": record.temperature,
                "max_tokens": record.max_tokens,
                "top_p": record.top_p,
                "presence_penalty": record.presence_penalty,
                "json_mode": record.json_mode,
            },
            messages=messages,
        )


def session_service_dependency():
    """FastAPI dependency that creates a SessionService with a DB session."""
    from fastapi import Depends

    async def _inner(session: AsyncSession = Depends(get_db)) -> SessionService:
        return SessionService(session)

    return _inner
