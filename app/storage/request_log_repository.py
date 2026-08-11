"""Request log repository."""

from sqlalchemy import select

from app.models.request_log import RequestLogRecord
from app.storage.base_repository import BaseRepository


class RequestLogRepository(BaseRepository[RequestLogRecord]):
    """Repository for API request log operations."""

    model = RequestLogRecord

    async def get_recent(self, limit: int = 50) -> list[RequestLogRecord]:
        """Fetch the most recent request logs."""
        stmt = select(RequestLogRecord).order_by(RequestLogRecord.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def delete_all(self) -> int:
        """Delete all request logs. Returns count deleted."""
        from sqlalchemy import delete, func

        count_stmt = select(func.count()).select_from(RequestLogRecord)
        count_result = await self.session.execute(count_stmt)
        count = count_result.scalar_one()
        stmt = delete(RequestLogRecord)
        await self.session.execute(stmt)
        await self.session.flush()
        return count
