"""Model repository."""

from app.models.model import ModelRecord
from app.storage.base_repository import BaseRepository


class ModelRepository(BaseRepository[ModelRecord]):
    """Repository for AI model CRUD operations."""

    model = ModelRecord
