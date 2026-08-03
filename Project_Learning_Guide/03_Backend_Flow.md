# 03 — Backend Flow

## What Happens When a Request Hits the Backend

This document traces exactly what happens inside the FastAPI backend when it receives an HTTP request. We'll trace multiple types of requests so you understand every path.

---

## The Universal Request Pipeline

Every single HTTP request to the backend follows this exact pipeline:

```
1. HTTP Request arrives at Uvicorn (port 8000)
         ↓
2. Uvicorn passes it to the ASGI application (FastAPI)
         ↓
3. Middleware stack runs (in order of registration):
   a. ServerErrorMiddleware (built-in, catches 500s)
   b. CORSMiddleware (adds CORS headers)
   c. ExceptionMiddleware (built-in, converts exceptions)
         ↓
4. FastAPI path routing (matches URL to handler)
         ↓
5. Dependency injection resolves:
   a. get_db() → yields AsyncSession
   b. Service constructors → creates service instances
   c. validate_bearer_token() → (only for gateway routes)
         ↓
6. Request body is parsed and validated by Pydantic
   (If validation fails → 422 error via custom error handler)
         ↓
7. Route handler function executes
         ↓
8. Response is serialized (Pydantic model → JSON)
         ↓
9. get_db() cleanup runs:
   a. On success: await session.commit()
   b. On exception: await session.rollback()
         ↓
10. HTTP Response is sent back
```

---

## Trace #1: GET /health

The simplest possible request. No database, no services.

### Source file: `app/api/routes/health.py` (lines 33-44)

```python
@router.get("/health", response_model=HealthResponse, ...)
async def health_check() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )
```

### What happens step-by-step:

| Step | What Happens | Code Location |
|------|-------------|---------------|
| 1 | `GET /health` arrives at Uvicorn | `uvicorn` runtime |
| 2 | CORSMiddleware adds headers | `app/main.py` line 30 |
| 3 | FastAPI matches `/health` to `health_check()` | `app/api/routes/health.py` line 33 |
| 4 | No `Depends()` parameters, so no DI needed | — |
| 5 | `get_settings()` returns the cached Settings singleton | `app/core/config.py` line 75 |
| 6 | `HealthResponse(...)` is constructed | `app/schemas/health.py` line 14 |
| 7 | Pydantic's `default_factory` sets `timestamp` to `datetime.now(UTC)` | `app/schemas/health.py` line 31 |
| 8 | FastAPI serializes `HealthResponse` to JSON | automatic |
| 9 | Response: `{"status": "healthy", "version": "0.2.0", ...}` | — |

### Response:
```json
{
  "status": "healthy",
  "version": "0.2.0",
  "environment": "development",
  "timestamp": "2026-07-30T10:00:00+00:00"
}
```

---

## Trace #2: GET /models

A database-backed read operation with the full Service → Repository → Model chain.

### Source file: `app/api/routes/models.py` (lines 18-23)

```python
@router.get("", response_model=ModelListResponse, ...)
async def list_models(session: AsyncSession = Depends(get_db)):
    service = ModelService(session)
    return await service.list_models()
```

### What happens step-by-step:

| Step | What Happens | Code Location |
|------|-------------|---------------|
| 1 | `GET /models` arrives | — |
| 2 | FastAPI matches to `list_models()` in `app/api/routes/models.py` | `app/api/router.py` line 20 mounts `/models` prefix |
| 3 | `Depends(get_db)` triggers `get_db()` | `app/core/database.py` line 36 |
| 4 | `async_session_factory()` creates a new `AsyncSession` | `app/core/database.py` line 28 |
| 5 | Session is yielded to the handler | `get_db()` is an async generator |
| 6 | `ModelService(session)` is constructed | `app/services/model_service.py` line 17 |
| 7 | `ModelRepository(session)` is created inside `ModelService.__init__` | `app/services/model_service.py` line 19 |
| 8 | `service.list_models()` is called | `app/services/model_service.py` line 21 |
| 9 | Inside: `records = await self.repo.get_all()` | Uses `BaseRepository.get_all()` |
| 10 | SQLAlchemy executes: `SELECT * FROM models LIMIT 100 OFFSET 0` | `app/storage/base_repository.py` line 36 |
| 11 | Results come back as list of `ModelRecord` objects | — |
| 12 | `ModelService` converts each `ModelRecord` to `ModelMetadata` (Pydantic) | `app/services/model_service.py` lines 24-40 |
| 13 | Returns `ModelListResponse(models=[...], total=len(...))` | — |
| 14 | FastAPI serializes to JSON | — |
| 15 | `get_db()` cleanup: `await session.commit()` (nothing to commit, but harmless) | `app/core/database.py` line 40 |

---

## Trace #3: POST /chat (Synchronous Chat)

A write-heavy request that talks to Gemini AI and persists messages.

### Source file: `app/api/routes/chat.py` (lines 17-22)

```python
@router.post("", response_model=ChatResponse, ...)
async def generate_chat(request: ChatRequest, session: AsyncSession = Depends(get_db)):
    service = ChatService(session)
    return await service.generate_response(request)
```

### What happens step-by-step:

| Step | What Happens | Code Location |
|------|-------------|---------------|
| 1 | `POST /chat` with JSON body arrives | — |
| 2 | FastAPI parses body into `ChatRequest` Pydantic model | `app/schemas/chat.py` line 24 |
| 3 | Pydantic validates: `messages` is required, `temperature` is 0.0-2.0 | automatic |
| 4 | If validation fails → `RequestValidationError` → `validation_exception_handler()` → `APIError` JSON | `app/api/errors.py` lines 27-44 |
| 5 | `Depends(get_db)` creates `AsyncSession` | `app/core/database.py` |
| 6 | `ChatService(session)` is constructed, creates `MessageRepository(session)` inside | `app/services/chat_service.py` line 18 |
| 7 | `service.generate_response(request)` is called | `app/services/chat_service.py` line 35 |
| 8 | Generates `response_id = "chatcmpl-{random 12 hex chars}"` | line 37 |
| 9 | If `request.session_id` exists, saves user message via `self.msg_repo.create(...)` | lines 42-47 |
| 10 | Calls `self._call_gemini(request)` | line 49 |
| 11 | Inside `_call_gemini`: checks if `GEMINI_API_KEY` is set | line 69 |
| 12a | **If API key exists**: configures `google.generativeai`, creates model, calls `generate_content_async()` | lines 72-90 |
| 12b | **If API key missing**: falls back to mock response text | lines 92-103 |
| 13 | Returns `(content_text, TokenUsage)` | — |
| 14 | If `request.session_id` exists, saves assistant message via `self.msg_repo.create(...)` | lines 51-55 |
| 15 | Constructs and returns `ChatResponse` | lines 57-66 |
| 16 | `get_db()` cleanup: `await session.commit()` (persists the messages) | — |

---

## Trace #4: POST /chat/stream (SSE Streaming)

The most complex request — involves async generators and Server-Sent Events.

### Source file: `app/api/routes/chat.py` (lines 25-32)

```python
@router.post("/stream", ...)
async def stream_chat(request: ChatRequest, session: AsyncSession = Depends(get_db)):
    service = ChatService(session)
    return StreamingResponse(
        service.stream_response(request),
        media_type="text/event-stream",
    )
```

### What happens step-by-step:

| Step | What Happens |
|------|-------------|
| 1 | `POST /chat/stream` with JSON body arrives |
| 2 | `ChatRequest` is validated (same as sync chat) |
| 3 | `ChatService(session)` is created |
| 4 | `StreamingResponse` is created with `service.stream_response(request)` as the content iterator |
| 5 | FastAPI starts sending the response with `Content-Type: text/event-stream` |
| 6 | `stream_response()` is an async generator — it runs lazily as FastAPI reads from it |
| 7 | Inside `stream_response()`: saves user message (if session_id) |
| 8 | Checks `GEMINI_API_KEY`: |
| 8a | **If set**: Calls `model.generate_content_async(stream=True)`, iterates chunks |
| 8b | **If not set**: Splits mock text into words, yields with 50ms delay |
| 9 | Each chunk is formatted as SSE: `data: {"id": "...", "chunk": "Hello", ...}\n\n` |
| 10 | `yield chunk_str` sends it to the client immediately |
| 11 | After all chunks: saves full assistant message to database |
| 12 | Yields final: `data: [DONE]\n\n` |
| 13 | Generator exits, `StreamingResponse` sends final bytes |

### SSE Wire Format Example:
```
data: {"id":"chatcmpl-a1b2c3d4e5f6","object":"chat.completion.chunk","created":1722340000,"model":"test-model","chunk":"Hello","finish_reason":null,"session_id":"abc-123"}

data: {"id":"chatcmpl-a1b2c3d4e5f6","object":"chat.completion.chunk","created":1722340000,"model":"test-model","chunk":" world!","finish_reason":null,"session_id":"abc-123"}

data: [DONE]

```

---

## Trace #5: POST /api/v1/chat/completions (OpenAI Gateway)

The OpenAI-compatible gateway adds authentication and request logging.

### Source file: `app/api/routes/gateway.py`

### What happens step-by-step:

| Step | What Happens | Code Location |
|------|-------------|---------------|
| 1 | `POST /api/v1/chat/completions` with `Authorization: Bearer om_...` header | — |
| 2 | `Depends(validate_bearer_token)` extracts the Bearer token | `gateway.py` line ~15 |
| 3 | Token validation: extracts 12-char prefix, queries `api_keys` table by prefix | `api_key_service.py` |
| 4 | Compares bcrypt hash of full token against stored hash | `api_key_service.py` |
| 5 | If invalid → HTTP 401 | — |
| 6 | If valid → handler executes | — |
| 7 | Raw `request.json()` is read (not Pydantic-validated) | `gateway.py` line 36 |
| 8 | Manually constructs `ChatRequest` from OpenAI format | lines 38-45 |
| 9 | `ChatService.generate_response()` is called (same as POST /chat) | line 48 |
| 10 | Response is reformatted to OpenAI format (with `choices` array) | lines 55-69 |
| 11 | `RequestLogRepository` saves the API request log (method, URL, status, timing) | lines 52-62 |
| 12 | Response returned in OpenAI-compatible format | — |

---

## Trace #6: POST /sessions (Creating a Session)

### Source file: `app/api/routes/sessions.py`

### What happens:

| Step | What Happens |
|------|-------------|
| 1 | `POST /sessions` with `{"title": "My Chat"}` |
| 2 | `SessionCreateRequest` validated (title is optional, defaults handled) |
| 3 | `SessionService(session)` created |
| 4 | `SessionService.create_session(request)` called |
| 5 | `SessionRepository.create(title=..., model_id=..., temperature=..., ...)` called |
| 6 | Inside `BaseRepository.create()`: constructs `SessionRecord(**kwargs)`, adds to session, flushes |
| 7 | `session.flush()` → SQL INSERT executes, but not committed yet |
| 8 | `session.refresh(instance)` → re-reads the row to get server-generated defaults (id, timestamps) |
| 9 | `SessionService` converts `SessionRecord` → `SessionResponse` (Pydantic) |
| 10 | Route returns with `status_code=201` |
| 11 | `get_db()` cleanup: `await session.commit()` → permanently saves the session |

---

## Error Handling Flow

When things go wrong, a specific error handling chain kicks in:

### Validation Error (422)
```
Invalid JSON body
    ↓
FastAPI raises RequestValidationError
    ↓
validation_exception_handler() in app/api/errors.py catches it
    ↓
Converts to APIError(
    error_type="validation_error",
    message="Request validation failed",
    details=[ErrorDetail(loc=["body", "messages"], msg="Field required", type="missing")]
)
    ↓
Returns HTTP 422 with standardized JSON
```

### Not Found (404)
```
GET /sessions/nonexistent-id
    ↓
SessionService.get_session() → SessionRepository.get_by_id() → returns None
    ↓
Route handler raises HTTPException(status_code=404, detail="Session not found")
    ↓
http_exception_handler() in app/api/errors.py catches it
    ↓
Converts to APIError(
    error_type="not_found",
    message="Session not found"
)
    ↓
Returns HTTP 404 with standardized JSON
```

### Unhandled Exception (500)
```
Any unexpected Python exception
    ↓
generic_exception_handler() in app/api/errors.py catches it
    ↓
Logs the error via structlog
    ↓
Converts to APIError(
    error_type="internal_error",
    message="An unexpected error occurred"
)
    ↓
get_db() cleanup: await session.rollback()
    ↓
Returns HTTP 500 with standardized JSON
```

---

## The Dependency Injection Chain (In Detail)

This is the single most important mechanism in the backend. Understanding this unlocks understanding the entire codebase.

### How `get_db()` Works

```python
# app/core/database.py
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:  # 1. Creates session
        try:
            yield session                            # 2. Hands it to the route handler
            await session.commit()                   # 3. Commits if handler succeeds
        except Exception:
            await session.rollback()                 # 4. Rolls back if handler fails
            raise                                    # 5. Re-raises the exception
```

This is an **async generator** used as a FastAPI dependency:

1. **Before `yield`**: Session is created (like a database connection)
2. **At `yield`**: The session is "injected" into your route handler
3. **After `yield` (success)**: Commit — all changes are saved permanently
4. **After `yield` (exception)**: Rollback — all changes are undone

### How Services Use the Session

```python
# In a route handler:
async def create_session(request: ..., session: AsyncSession = Depends(get_db)):
    service = SessionService(session)        # Session passed to service
    return await service.create_session(request)

# Inside SessionService:
class SessionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.session_repo = SessionRepository(session)   # Session passed to repo
        self.message_repo = MessageRepository(session)    # Same session shared

# Inside SessionRepository:
class SessionRepository(BaseRepository[SessionRecord]):
    model = SessionRecord
    # Inherits __init__ from BaseRepository which stores self.session
```

**Key insight**: All repositories within a single request share the **same database session**. This means all their operations are part of a **single transaction**. If any operation fails, everything rolls back together.
