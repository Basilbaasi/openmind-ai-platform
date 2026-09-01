from pydantic import BaseModel, Field


class ModelCreateRequest(BaseModel):
    id: str = Field(..., description="Unique model identifier")
    name: str = Field(..., description="Display name")
    provider: str = Field("Local", description="Provider (Local, Cloud, etc.)")
    type: str = Field("text", description="Model type (text, vision, embedding)")
    context_window: int = Field(8192, description="Max context length")
    parameters: str = Field("7B", description="Parameter count or description")
    latency_ms: int = Field(50, description="Latency in milliseconds")
    vram_required_gb: float = Field(0.0, description="VRAM required in GB")
    rpm_limit: int = Field(1000, description="Requests per minute limit")
    status: str = Field("Deployed", description="Status (Deployed, Offline, Syncing)")
    description: str = Field("", description="Detailed model description")
    adapter_code: str = Field("", description="Python adapter code for executing this model")
    local_run_command: str = Field("", description="Local Docker/Terminal startup command")
    model_api_key: str = Field("", description="API key for this specific model provider")


class ModelUpdateRequest(BaseModel):
    name: str | None = None
    provider: str | None = None
    type: str | None = None
    context_window: int | None = None
    parameters: str | None = None
    latency_ms: int | None = None
    vram_required_gb: float | None = None
    rpm_limit: int | None = None
    status: str | None = None
    description: str | None = None
    adapter_code: str | None = None
    local_run_command: str | None = None
    model_api_key: str | None = None


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
    version: str = Field("1.0", description="Model version string")
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
    type: str = Field("text", description="Model type")
    parameters: str = Field("", description="Parameters")
    latency_ms: int = Field(0, description="Latency ms")
    vram_required_gb: float = Field(0.0, description="VRAM required GB")
    rpm_limit: int = Field(1000, description="RPM limit")
    status: str = Field("Deployed", description="Status")
    description: str = Field("", description="Description")
    adapter_code: str = Field("", description="Python adapter code for this model")
    local_run_command: str = Field("", description="Local Docker/Terminal startup command")
    model_api_key_masked: str = Field("", description="Masked API key (e.g., '••••ab12')")


class ModelListResponse(BaseModel):
    """
    Response schema for listing available models.
    """

    models: list[ModelMetadata] = Field(..., description="List of available models")
    total: int = Field(..., description="Total number of available models")
