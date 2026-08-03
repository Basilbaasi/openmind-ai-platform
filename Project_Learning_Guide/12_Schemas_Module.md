# 12 — Schemas Module Deep Dive

Every file in `app/schemas/` explained.

Schemas are **Pydantic models** that define the shape of API requests and responses. They are separate from SQLAlchemy models (which define database tables).

**Key difference**:
- **SQLAlchemy model** (`app/models/`): Maps to a database table. Has columns, relationships, constraints.
- **Pydantic schema** (`app/schemas/`): Validates JSON data. Has fields, type checks, default values, descriptions.

---

## File: `app/schemas/chat.py`

The most important schema file — defines everything related to chat communication.

### `RoleEnum` (lines 6-10)

```python
class RoleEnum(str, Enum):
    system = "system"
    user = "user"
    assistant = "assistant"
    tool = "tool"
```

- Inherits from both `str` and `Enum` — this means values are strings AND enum members.
- Restricts the `role` field to exactly these four values. Sending `"admin"` would cause a 422 error.
- `tool` is defined but not actively used in the current codebase.

### `ChatMessage` (lines 13-15)

```python
class ChatMessage(BaseModel):
    role: RoleEnum = Field(..., description="Role of the message author")
    content: str = Field(..., description="Content of the message")
```

- `Field(...)`: The `...` (Ellipsis) means **required** — must be provided.
- Used in both requests (incoming messages) and responses (generated messages).

### `TokenUsage` (lines 18-21)

```python
class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
```

- All fields default to `0` — the client doesn't need to provide them.
- Filled in by `ChatService` after token estimation.

### `ChatRequest` (lines 24-33)

```python
class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(
        ..., description="A list of previous messages in the conversation"
    )
    model: str = Field("default", description="The ID of the model to use")
    session_id: str | None = Field(
        None, description="Optional session ID to associate this conversation"
    )
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: int | None = Field(None, description="Maximum number of tokens to generate")
```

**Validation rules**:
- `messages`: **Required** (`...`). Must be a list of `ChatMessage` objects.
- `model`: Optional. Defaults to `"default"`.
- `session_id`: Optional. If provided, messages are persisted to the database.
- `temperature`: Must be between 0.0 and 2.0 (`ge=0.0, le=2.0`). Default: 0.7.
- `max_tokens`: Optional. `None` means "use model's default."

**Example valid request**:
```json
{
    "messages": [
        {"role": "system", "content": "You are helpful."},
        {"role": "user", "content": "Hello!"}
    ],
    "model": "gemini-2.0-flash",
    "temperature": 0.9
}
```

**Example invalid request** (triggers 422):
```json
{
    "model": "test"
}
```
Error: `messages` field is required.

### `ChatResponse` (lines 36-44)

```python
class ChatResponse(BaseModel):
    id: str = Field(..., description="Unique identifier for the chat completion")
    object: str = Field("chat.completion", description="Object type")
    created: int = Field(..., description="Unix timestamp")
    model: str = Field(..., description="The model used")
    message: ChatMessage = Field(..., description="The generated message")
    finish_reason: str = Field(..., description="Why the model stopped")
    usage: TokenUsage = Field(..., description="Token usage statistics")
    session_id: str | None = Field(None, description="The session ID")
```

This matches the OpenAI API response format (with minor differences — OpenAI uses `choices` array, this uses a single `message`).

### `ChatStreamResponse` (lines 47-57)

```python
class ChatStreamResponse(BaseModel):
    id: str
    object: str = "chat.completion.chunk"
    created: int
    model: str
    chunk: str = Field(..., description="The generated text chunk")
    finish_reason: str | None = Field(None)
    session_id: str | None = None
```

Used for SSE streaming. Similar to `ChatResponse` but:
- `object` is `"chat.completion.chunk"` instead of `"chat.completion"`.
- Has `chunk` (a text fragment) instead of `message`.
- `finish_reason` is `None` for all chunks except the last.

---

## File: `app/schemas/health.py`

### `HealthResponse` (lines 14-33)

```python
class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Current health status", examples=["healthy"])
    version: str = Field(description="Semantic version", examples=["0.1.0"])
    environment: str = Field(description="Deployment environment", examples=["development"])
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="UTC timestamp of the health check",
    )
```

- `default_factory=lambda: datetime.now(UTC)`: Creates a new timestamp for EACH response (not a shared default).
- `examples=[...]`: Shown in Swagger UI documentation.

### `RootResponse` (lines 36-50)

```python
class RootResponse(BaseModel):
    message: str = Field(description="Welcome message", examples=["Welcome to OpenMind AI Platform"])
    version: str = Field(description="Semantic version", examples=["0.1.0"])
    docs_url: str = Field(description="URL path to interactive docs", examples=["/docs"])
```

---

## File: `app/schemas/errors.py`

### `ErrorDetail` (lines 4-9)

```python
class ErrorDetail(BaseModel):
    loc: list[str] | None = Field(default=None, description="Location of the error")
    msg: str = Field(..., description="Human-readable error message")
    type: str = Field(..., description="Error type identifier")
```

- `loc`: Where in the request the error occurred (e.g., `["body", "messages"]`).
- `msg`: What went wrong (e.g., `"Field required"`).
- `type`: Machine-readable error type (e.g., `"missing"`).

### `APIError` (lines 12-28)

```python
class APIError(BaseModel):
    error_type: str = Field(..., description="High-level error category")
    message: str = Field(..., description="A friendly error message")
    details: list[ErrorDetail] | None = Field(default=None, description="Detailed validation errors")
```

**Every error response** in the API uses this schema:

```json
{
    "error_type": "validation_error",
    "message": "Request validation failed",
    "details": [
        {
            "loc": ["body", "messages"],
            "msg": "Field required",
            "type": "missing"
        }
    ]
}
```

---

## File: `app/schemas/models.py`

### `ModelCreateRequest` (lines 3-14)

All fields required for creating a new model. `id` is user-provided (not auto-generated).

### `ModelUpdateRequest` (lines 17-27)

All fields are `Optional` (`None` by default). Only non-None fields are applied during update.

### `ModelMetadata` (lines 30-61)

The response schema. Includes fields NOT in the database:
- `version: str = "1.0"` — hardcoded in the service
- `capabilities: list[str]` — hardcoded as `["chat"]`
- `available: bool` — computed from `status == "Deployed"`

### `ModelListResponse` (lines 64-70)

```python
class ModelListResponse(BaseModel):
    models: list[ModelMetadata]
    total: int
```

Wrapper for listing multiple models.

---

## File: `app/schemas/sessions.py`

### `SessionCreateRequest` (lines 7-21)

```python
class SessionCreateRequest(BaseModel):
    title: str | None = Field(None, description="Optional title")
    model_id: str | None = Field(None)
    temperature: float | None = Field(0.7)
    max_tokens: int | None = Field(1024)
    top_p: float | None = Field(0.9)
    presence_penalty: float | None = Field(0.0)
    json_mode: bool | None = Field(False)
    metadata: dict[str, Any] | None = Field(default_factory=dict)
```

All fields optional with sensible defaults. The `metadata` field is a free-form dictionary.

### `SessionResponse` (lines 40-49)

```python
class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)
```

The service bundles `model_id`, `temperature`, `max_tokens`, etc. INTO the `metadata` dict when building this response. This means the response shape is simpler but the individual fields are nested inside `metadata`.

### `MessageCreateRequest` (lines 35-37)

```python
class MessageCreateRequest(BaseModel):
    role: str = Field("user")
    content: str = Field(..., description="Message text content")
```

Simple: role (defaults to "user") and required content.

---

## Schema vs Model Comparison

| SQLAlchemy Model (Database) | Pydantic Schema (API) | Difference |
|----------------------------|----------------------|------------|
| `ModelRecord.context_window` | `ModelMetadata.max_context_length` | Different name |
| — | `ModelMetadata.version` | Not in DB (hardcoded) |
| — | `ModelMetadata.capabilities` | Not in DB (hardcoded) |
| — | `ModelMetadata.available` | Computed from `status` |
| `SessionRecord.model_id` | `SessionResponse.metadata["model_id"]` | Nested in metadata dict |
| `SessionRecord.temperature` | `SessionResponse.metadata["temperature"]` | Nested in metadata dict |
| `MessageRecord.session_id` (FK) | Not in `MessageCreateRequest` | Comes from URL path parameter |
| `ApiKeyRecord.key_hash` | Never exposed in any response | Security — hash never leaves server |
