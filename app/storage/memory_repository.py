"""Memory node and connection repositories."""

from sqlalchemy import select

from app.models.memory import MemoryConnectionRecord, MemoryNodeRecord
from app.storage.base_repository import BaseRepository


class MemoryNodeRepository(BaseRepository[MemoryNodeRecord]):
    """Repository for memory node operations."""

    model = MemoryNodeRecord

    async def get_by_tier(self, tier: str) -> list[MemoryNodeRecord]:
        """Fetch all nodes in a given tier."""
        stmt = select(MemoryNodeRecord).where(MemoryNodeRecord.tier == tier)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class MemoryConnectionRepository(BaseRepository[MemoryConnectionRecord]):
    """Repository for memory connection operations."""

    model = MemoryConnectionRecord

    async def get_connections_for_node(self, node_id: str) -> list[MemoryConnectionRecord]:
        """Fetch all outgoing connections from a node."""
        stmt = select(MemoryConnectionRecord).where(
            MemoryConnectionRecord.source_node_id == node_id
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
