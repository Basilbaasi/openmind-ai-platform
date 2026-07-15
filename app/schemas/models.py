
from pydantic import BaseModel, Field


class ModelMetadata(BaseModel):
    """
    Standardized representation of an AI model available on the platform.
    """

    id: str = Field(
        ..., description="Unique identifier for the model (e.g., 'gpt-4', 'llama-3-8b')"
    )
    name: str = Field(..., description="Human-readable display name")
    provider: str = Field(
        ..., description="The entity hosting/providing the model (e.g., 'local', 'openai')"
    )
    version: str = Field(..., description="Model version string")
    capabilities: list[str] = Field(
        default_factory=list,
        description="List of supported features (e.g., 'chat', 'vision', 'tools')",
    )
    max_context_length: int = Field(
        ..., description="Maximum number of tokens supported in the context window"
    )
    available: bool = Field(
        True, description="Whether the model is currently online and accepting requests"
    )


class ModelListResponse(BaseModel):
    """
    Response schema for listing available models.
    """

    models: list[ModelMetadata] = Field(..., description="List of available models")
    total: int = Field(..., description="Total number of available models")
