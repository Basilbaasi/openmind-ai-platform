from sqlalchemy.ext.asyncio import AsyncSession

from app.model_adapters.executor import (
    delete_adapter_file,
    save_adapter_file,
    validate_adapter_code,
)
from app.models.model import ModelRecord
from app.schemas.models import ModelMetadata
from app.storage.model_repository import ModelRepository


def _mask_api_key(key: str) -> str:
    """Mask an API key, showing only the last 4 characters."""
    if not key or len(key) < 5:
        return "••••" if key else ""
    return "••••" + key[-4:]


class ModelService:
    """
    Service responsible for model discovery and management.
    Now backed by real database persistence.
    Adapter code is saved as files named by model ID.
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

    async def get_model_record(self, model_id: str) -> ModelRecord | None:
        """Retrieves the raw model record (includes API key and adapter code)."""
        return await self.repo.get_by_id(model_id)

    async def create_model(self, data: dict) -> ModelMetadata:
        """Creates a new model record and saves its adapter code to a file."""
        adapter_code = data.get("adapter_code", "")
        model_id = data.get("id", "")
        if adapter_code.strip():
            validate_adapter_code(adapter_code)
        record = await self.repo.create(**data)

        # Save adapter code to file named by model ID
        if adapter_code and model_id:
            save_adapter_file(model_id, adapter_code)

        return self._to_schema(record)

    async def update_model(self, model_id: str, data: dict) -> ModelMetadata | None:
        """Updates an existing model record and its adapter code file."""
        adapter_code = data.get("adapter_code")
        if adapter_code is not None and adapter_code.strip():
            validate_adapter_code(adapter_code)
        record = await self.repo.update(model_id, **data)
        if record is None:
            return None

        # Update the adapter code file if code was provided
        if adapter_code is not None:
            save_adapter_file(model_id, adapter_code)

        return self._to_schema(record)

    async def delete_model(self, model_id: str) -> bool:
        """Deletes a model record and its adapter code file."""
        result = await self.repo.delete(model_id)
        if result:
            delete_adapter_file(model_id)
        return result

    @staticmethod
    def _to_schema(record: ModelRecord) -> ModelMetadata:
        """Convert an ORM record to the API response schema."""
        raw_key = record.model_api_key or ""
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
            adapter_code=record.adapter_code or "",
            model_api_key_masked=_mask_api_key(raw_key),
        )
