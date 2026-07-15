
from app.schemas.models import ModelMetadata


class ModelService:
    """
    Service responsible for model discovery and management.
    """

    async def list_models(self) -> list[ModelMetadata]:
        """
        Retrieves the list of available models.

        Currently returns deterministic mock data. In future milestones,
        this will query active providers (local or remote) to discover models dynamically.
        """
        mock_models = [
            ModelMetadata(
                id="mock-chat-v1",
                name="Mock Chat Model Fast",
                provider="local",
                version="1.0",
                capabilities=["chat"],
                max_context_length=8192,
                available=True,
            ),
            ModelMetadata(
                id="mock-reasoning-v1",
                name="Mock Reasoning Model Advanced",
                provider="local",
                version="1.0",
                capabilities=["chat", "reasoning"],
                max_context_length=32768,
                available=True,
            ),
        ]
        return mock_models


# Dependency provider for FastAPI
def get_model_service() -> ModelService:
    return ModelService()
