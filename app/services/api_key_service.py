"""
API Key service — generation, validation, and management.
"""

import secrets
from datetime import UTC, datetime

import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.storage.api_key_repository import ApiKeyRepository


class ApiKeyService:
    """Manages API key lifecycle."""

    def __init__(self, session: AsyncSession) -> None:
        self.repo = ApiKeyRepository(session)

    async def create_key(self, name: str) -> dict:
        """
        Generate a new API key.
        Returns the raw key ONCE — it's never stored.
        """
        raw_key = f"om_{secrets.token_urlsafe(32)}"
        key_hash = bcrypt.hashpw(raw_key.encode(), bcrypt.gensalt()).decode()
        prefix = raw_key[:12] + "..."

        record = await self.repo.create(
            name=name,
            key_hash=key_hash,
            key_prefix=prefix,
        )
        return {
            "id": record.id,
            "name": record.name,
            "key": raw_key,  # Only returned on creation
            "key_prefix": prefix,
            "created_at": record.created_at.isoformat() if record.created_at else "",
        }

    async def validate_key(self, raw_key: str) -> bool:
        """Validate a raw API key against stored hashes using fast prefix lookup."""
        prefix = raw_key[:12] + "..."
        record = await self.repo.get_by_prefix(prefix)
        if (
            record
            and record.is_active
            and bcrypt.checkpw(raw_key.encode(), record.key_hash.encode())
        ):
            record.last_used_at = datetime.now(UTC).isoformat()
            await self.repo.session.flush()
            return True
        return False

    async def list_keys(self) -> list[dict]:
        """List all API keys (without hashes)."""
        records = await self.repo.get_all_active()
        return [
            {
                "id": r.id,
                "name": r.name,
                "key_prefix": r.key_prefix,
                "created_at": r.created_at.isoformat() if r.created_at else "",
                "last_used": r.last_used_at or "Never",
            }
            for r in records
        ]

    async def delete_key(self, key_id: str) -> bool:
        """Deactivate an API key."""
        record = await self.repo.get_by_id(key_id)
        if record is None:
            return False
        record.is_active = False
        await self.repo.session.flush()
        return True


def api_key_service_dependency():
    from fastapi import Depends

    async def _inner(session: AsyncSession = Depends(get_db)) -> ApiKeyService:
        return ApiKeyService(session)

    return _inner
