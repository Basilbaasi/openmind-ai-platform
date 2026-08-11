"""Session and message repositories."""

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.session import MessageRecord, SessionRecord
from app.storage.base_repository import BaseRepository


class SessionRepository(BaseRepository[SessionRecord]):
    """Repository for session CRUD operations."""

    model = SessionRecord

    async def get_with_messages(self, session_id: str) -> SessionRecord | None:
        """Fetch a session with its messages eagerly loaded."""
        stmt = (
            select(SessionRecord)
            .options(selectinload(SessionRecord.messages))
            .where(SessionRecord.id == session_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_with_messages(self, limit: int = 100, offset: int = 0) -> list[SessionRecord]:
        """Fetch all sessions with messages eagerly loaded."""
        stmt = (
            select(SessionRecord)
            .options(selectinload(SessionRecord.messages))
            .limit(limit)
            .offset(offset)
            .order_by(SessionRecord.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class MessageRepository(BaseRepository[MessageRecord]):
    """Repository for message CRUD operations."""

    model = MessageRecord

    async def get_by_session(self, session_id: str) -> list[MessageRecord]:
        """Fetch all messages for a given session, ordered by creation time."""
        stmt = (
            select(MessageRecord)
            .where(MessageRecord.session_id == session_id)
            .order_by(MessageRecord.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
