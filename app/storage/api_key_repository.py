"""API key repository."""

from sqlalchemy import select

from app.models.api_key import ApiKeyRecord
from app.storage.base_repository import BaseRepository


class ApiKeyRepository(BaseRepository[ApiKeyRecord]):
    """Repository for API key CRUD operations."""

    model = ApiKeyRecord

    async def get_all_active(self) -> list[ApiKeyRecord]:
        """Fetch all active API keys."""
        stmt = select(ApiKeyRecord).where(ApiKeyRecord.is_active.is_(True))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_prefix(self, prefix: str) -> ApiKeyRecord | None:
        """Find an API key by its prefix."""
        stmt = select(ApiKeyRecord).where(ApiKeyRecord.key_prefix == prefix)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
