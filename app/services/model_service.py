from sqlalchemy.ext.asyncio import AsyncSession

from app.models.model import ModelRecord
from app.schemas.models import ModelMetadata
from app.storage.model_repository import ModelRepository


class ModelService:
    """
    Service responsible for model discovery and management.
    Now backed by real database persistence.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.repo = ModelRepository(session)

    async def list_models(self) -> list[ModelMetadata]:
        """Retrieves all models from the database."""
        records = await self.repo.get_all(limit=200)
        return [self._to_schema(r) for r in records]

    async def get_model(self, model_id: str) -> ModelMetadata | None:
        """Retrieves a single model by ID."""
        record = await self.repo.get_by_id(model_id)
        if record is None:
            return None
        return self._to_schema(record)

    async def create_model(self, data: dict) -> ModelMetadata:
        """Creates a new model record."""
        record = await self.repo.create(**data)
        return self._to_schema(record)

    async def update_model(self, model_id: str, data: dict) -> ModelMetadata | None:
        """Updates an existing model record."""
        record = await self.repo.update(model_id, **data)
        if record is None:
            return None
        return self._to_schema(record)

    async def delete_model(self, model_id: str) -> bool:
        """Deletes a model record."""
        return await self.repo.delete(model_id)

    @staticmethod
    def _to_schema(record: ModelRecord) -> ModelMetadata:
        """Convert an ORM record to the API response schema."""
        return ModelMetadata(
            id=record.id,
            name=record.name,
            provider=record.provider,
            version="1.0",
            capabilities=[record.type],
            max_context_length=record.context_window,
            available=record.status == "Deployed",
            type=record.type,
            parameters=record.parameters or "",
            latency_ms=record.latency_ms or 0,
            vram_required_gb=record.vram_required_gb or 0.0,
            rpm_limit=record.rpm_limit or 1000,
            status=record.status or "Deployed",
            description=record.description or "",
        )
