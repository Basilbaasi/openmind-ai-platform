# 10 — API Module Deep Dive

Every file in `app/api/` explained.

---

## File: `app/api/router.py`

**Purpose**: The central routing hub. Mounts all 13 domain route modules into a single `APIRouter`, which is then included in the main `FastAPI` app.

```python
from fastapi import APIRouter

from app.api.routes import (
    api_keys, benchmarks, chat, gateway, health,
    knowledge, logs, memory, models, monitoring,
    sessions, settings, workflows,
)

api_router = APIRouter()

# Order matters only for documentation — it determines the order in Swagger UI
api_router.include_router(health.router)                                       # /, /health
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])          # /chat, /chat/stream
api_router.include_router(models.router, prefix="/models", tags=["Models"])    # /models
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(gateway.router, prefix="/api/v1", tags=["Gateway"])  # /api/v1/*
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])
api_router.include_router(memory.router, prefix="/memory", tags=["Memory"])
api_router.include_router(api_keys.router, prefix="/api-keys", tags=["API Keys"])
api_router.include_router(monitoring.router, tags=["Monitoring"])              # /api/status
api_router.include_router(logs.router, prefix="/logs", tags=["Logs"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(benchmarks.router, prefix="/benchmarks", tags=["Benchmarks"])
```

**How `include_router()` works**:
- `prefix="/chat"`: All routes inside `chat.router` get this prefix. So `@router.post("")` becomes `POST /chat`, and `@router.post("/stream")` becomes `POST /chat/stream`.
- `tags=["Chat"]`: Groups these endpoints under "Chat" in Swagger UI.
- Health routes have NO prefix, so `@router.get("/")` stays as `GET /` and `@router.get("/health")` stays as `GET /health`.

---

## File: `app/api/errors.py`

**Purpose**: Defines global exception handlers so ALL errors return a consistent `APIError` JSON format.

### Exception Handlers:

**1. Validation Error Handler (422)**:
```python
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = [
        ErrorDetail(
            loc=[str(e) for e in err.get("loc", [])],
            msg=err.get("msg", ""),
            type=err.get("type", ""),
        )
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=APIError(
            error_type="validation_error",
            message="Request validation failed",
            details=details,
        ).model_dump(),
    )
```
**When triggered**: When Pydantic can't parse the request body (missing fields, wrong types, out-of-range values).

**2. HTTP Exception Handler (4xx/5xx)**:
```python
async def http_exception_handler(request: Request, exc: HTTPException):
    error_type_map = {
        400: "bad_request", 401: "unauthorized", 403: "forbidden",
        404: "not_found", 405: "method_not_allowed", 409: "conflict",
    }
    return JSONResponse(
        status_code=exc.status_code,
        content=APIError(
            error_type=error_type_map.get(exc.status_code, "http_error"),
            message=str(exc.detail),
        ).model_dump(),
    )
```
**When triggered**: When a route handler raises `HTTPException(status_code=404, detail="Not found")`.

**3. Generic Exception Handler (500)**:
```python
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", error=str(exc), ...)
    return JSONResponse(
        status_code=500,
        content=APIError(
            error_type="internal_error",
            message="An unexpected error occurred",
        ).model_dump(),
    )
```
**When triggered**: Any unhandled Python exception. The actual error is logged but NOT shown to the client (for security).

### `add_exception_handlers()`:
```python
def add_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
```
Called once in `main.py` during app creation. Registers all three handlers.

---

## Complete API Endpoint Reference

### Health & Root

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `GET` | `/` | `root()` | `RootResponse` | None |
| `GET` | `/health` | `health_check()` | `HealthResponse` | None |

### Chat

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `POST` | `/chat` | `generate_chat()` | `ChatResponse` | None |
| `POST` | `/chat/stream` | `stream_chat()` | SSE Stream | None |

### Models

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `GET` | `/models` | `list_models()` | `ModelListResponse` | None |
| `POST` | `/models` | `create_model()` | `ModelMetadata` (201) | None |
| `PUT` | `/models/{id}` | `update_model()` | `ModelMetadata` | None |
| `DELETE` | `/models/{id}` | `delete_model()` | 204 No Content | None |

### Sessions

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `GET` | `/sessions` | `list_sessions()` | `SessionListResponse` | None |
| `POST` | `/sessions` | `create_session()` | `SessionResponse` (201) | None |
| `GET` | `/sessions/{id}` | `get_session()` | Session + messages | None |
| `PUT` | `/sessions/{id}` | `update_session()` | `SessionResponse` | None |
| `DELETE` | `/sessions/{id}` | `delete_session()` | 204 No Content | None |
| `GET` | `/sessions/{id}/messages` | `get_messages()` | `list[Message]` | None |
| `POST` | `/sessions/{id}/messages` | `add_message()` | Message (201) | None |

### Gateway (OpenAI-Compatible)

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `POST` | `/api/v1/chat/completions` | `gateway_chat()` | OpenAI format | Bearer token |
| `POST` | `/api/v1/embeddings` | `gateway_embeddings()` | OpenAI format | Bearer token |
| `GET` | `/api/v1/models` | `gateway_models()` | OpenAI format | None |

### Knowledge

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `GET` | `/knowledge` | `list_knowledge()` | `list[dict]` | None |
| `POST` | `/knowledge` | `create_knowledge()` | dict (201) | None |
| `POST` | `/knowledge/upload` | `upload_knowledge()` | dict | None |
| `DELETE` | `/knowledge/{id}` | `delete_knowledge()` | 204 No Content | None |

### Workflows

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `GET` | `/workflows` | `list_workflows()` | `list[dict]` | None |
| `POST` | `/workflows` | `create_workflow()` | dict (201) | None |
| `GET` | `/workflows/{id}` | `get_workflow()` | dict | None |
| `PUT` | `/workflows/{id}` | `update_workflow()` | dict | None |
| `DELETE` | `/workflows/{id}` | `delete_workflow()` | 204 No Content | None |
| `POST` | `/workflows/{id}/execute` | `execute_workflow()` | dict | None |

### Memory

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `GET` | `/memory/nodes` | `list_memory_nodes()` | `list[dict]` | None |
| `POST` | `/memory/nodes` | `create_memory_node()` | dict (201) | None |
| `GET` | `/memory/logs` | `list_memory_logs()` | `list[dict]` | None |
| `POST` | `/memory/logs` | `create_memory_log()` | dict (201) | None |

### API Keys

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `GET` | `/api-keys` | `list_api_keys()` | `list[dict]` | None |
| `POST` | `/api-keys` | `create_api_key()` | dict (with raw key) | None |
| `DELETE` | `/api-keys/{id}` | `delete_api_key()` | 204 No Content | None |

### Monitoring

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `GET` | `/api/status` | `get_status()` | dict (CPU, RAM, DB health) | None |

### Logs

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `GET` | `/logs/system` | `get_system_logs()` | `list[dict]` | None |
| `POST` | `/logs/system` | `create_system_log()` | dict (201) | None |
| `GET` | `/logs/api` | `get_api_logs()` | `list[dict]` | None |
| `DELETE` | `/logs/api` | `clear_api_logs()` | dict (count) | None |

### Settings

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `GET` | `/settings` | `get_settings()` | `dict[str, str]` | None |
| `PUT` | `/settings` | `update_settings()` | `dict[str, str]` | None |

### Benchmarks

| Method | Path | Handler | Response | Auth |
|--------|------|---------|----------|------|
| `GET` | `/benchmarks` | `list_benchmarks()` | `list[dict]` | None |

---

## Route Pattern

Every route in this project follows the same pattern:

```python
@router.post("", status_code=201)
async def create_something(
    request: SomePydanticSchema,                    # Validated request body
    session: AsyncSession = Depends(get_db),        # Injected DB session
):
    service = SomeService(session)                   # Create service
    return await service.create_something(request)   # Delegate to service
```

**The route handler's only job**: 
1. Receive HTTP → 2. Get dependencies → 3. Call service → 4. Return response

All business logic lives in services. All data access lives in repositories.
