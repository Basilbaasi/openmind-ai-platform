"""Knowledge source repository."""

from app.models.knowledge import KnowledgeSourceRecord
from app.storage.base_repository import BaseRepository


class KnowledgeRepository(BaseRepository[KnowledgeSourceRecord]):
    """Repository for knowledge source CRUD operations."""

    model = KnowledgeSourceRecord
