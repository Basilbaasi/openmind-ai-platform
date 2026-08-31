"""Knowledge chunk repository."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge_chunk import KnowledgeChunkRecord
from app.storage.base_repository import BaseRepository


class KnowledgeChunkRepository(BaseRepository[KnowledgeChunkRecord]):
    """Repository for knowledge chunk CRUD operations."""

    model = KnowledgeChunkRecord

    async def get_by_source(self, source_id: str) -> list[KnowledgeChunkRecord]:
        """Retrieve all chunks for a given knowledge source, ordered by index."""
        stmt = (
            select(KnowledgeChunkRecord)
            .where(KnowledgeChunkRecord.source_id == source_id)
            .order_by(KnowledgeChunkRecord.chunk_index)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def delete_by_source(self, source_id: str) -> int:
        """Delete all chunks belonging to a source. Returns count deleted."""
        chunks = await self.get_by_source(source_id)
        for chunk in chunks:
            await self.session.delete(chunk)
        await self.session.flush()
        return len(chunks)

    async def search_chunks(self, query: str, limit: int = 10) -> list[KnowledgeChunkRecord]:
        """Basic keyword search across all chunks (case-insensitive LIKE)."""
        stmt = (
            select(KnowledgeChunkRecord)
            .where(KnowledgeChunkRecord.chunk_text.ilike(f"%{query}%"))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
