# 16 — Tests

Every test file explained: what it tests, why it exists, and how the test infrastructure works.

---

## Test Infrastructure

### `tests/conftest.py` — Shared Fixtures

```python
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import create_application

@pytest.fixture
def app():
    """Create a fresh FastAPI application for each test session."""
    return create_application()

@pytest.fixture
async def async_client(app):
    """Async HTTP client bound to the test application."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
```

**How it works**:
1. `app` fixture: Calls `create_application()` — creates a fresh FastAPI instance per test. This means each test gets a clean app.
2. `async_client` fixture: Creates an `httpx.AsyncClient` that talks directly to the app in-memory (no actual HTTP server needed).
   - `ASGITransport(app=app)`: Bypasses the network stack entirely — requests go directly to the ASGI app.
   - `base_url="http://testserver"`: Required by httpx but not actually used (no real HTTP).
   - `yield client`: Provides the client and cleans up after the test.

**Key insight**: Tests use an in-memory SQLite database (the default `DATABASE_URL` in config). No PostgreSQL needed for tests.

### `pyproject.toml` — Test Configuration

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
python_files = ["test_*.py"]
```

- `asyncio_mode = "auto"`: pytest-asyncio automatically detects `async def test_*` functions. No need for `@pytest.mark.asyncio` in most cases (though the project adds it explicitly for clarity).

---

## Test File: `tests/test_health.py` (165 lines, 13 tests)

**Purpose**: The most critical tests — verifies the app boots, serves traffic, and returns correct contract for monitoring.

| Test | What it verifies |
|------|-----------------|
| `test_root_returns_200` | `GET /` returns 200 with `message`, `version`, `docs_url` |
| `test_root_contains_app_name` | Response message includes "OpenMind" |
| `test_root_returns_json_content_type` | Content-Type header is `application/json` |
| `test_root_version_is_semver` | Version matches `X.Y.Z` format |
| `test_health_returns_200` | `GET /health` returns 200 with `status: "healthy"` |
| `test_health_response_schema` | Response has exactly: status, version, environment, timestamp |
| `test_health_returns_json_content_type` | Content-Type is correct |
| `test_health_status_is_healthy` | Status value is exactly `"healthy"` |
| `test_health_environment_is_valid` | Environment is one of: development, staging, production |
| `test_health_timestamp_is_iso_format` | Timestamp parses as valid ISO 8601 |
| `test_health_post_not_allowed` | `POST /health` returns 405 |
| `test_health_version_matches_root` | `/health` and `/` report same version |
| `test_openapi_schema_available` | `/openapi.json` returns valid OpenAPI schema |
| `test_undefined_route_returns_404` | `/nonexistent` returns 404 |

---

## Test File: `tests/test_config.py` (153 lines, 17 tests)

**Purpose**: Verifies the configuration system loads correctly, validates constraints, and caches properly.

### Test Classes:

**`TestSettingsDefaults`** (10 tests):
Verifies every default value matches what's in `config.py`:
- APP_NAME = "OpenMind AI Platform"
- APP_VERSION = "0.2.0"
- ENVIRONMENT = "development"
- DEBUG = False
- HOST = "0.0.0.0"
- PORT = 8000
- WORKERS = 1
- LOG_LEVEL = "INFO"
- LOG_FORMAT = "text"
- CORS_ORIGINS = ["*"]

**`TestSettingsValidation`** (4 tests):
- Invalid ENVIRONMENT (`"invalid"`) → `ValidationError`
- Valid ENVIRONMENT (`"staging"`, `"production"`) → accepted
- Invalid LOG_LEVEL (`"VERBOSE"`) → `ValidationError`
- Invalid LOG_FORMAT (`"xml"`) → `ValidationError`

**`TestSettingsOverride`** (3 tests):
- Override APP_NAME → works
- Override PORT → works
- Override DEBUG → works

**`TestGetSettings`** (3 tests):
- Returns `Settings` instance
- Returns same instance on repeated calls (caching)
- Has all expected attributes

---

## Test File: `tests/test_application.py` (107 lines, 9 tests)

**Purpose**: Verifies the application factory and lifecycle.

### Test Classes:

**`TestCreateApplication`** (8 tests):
- Returns `FastAPI` instance
- Title matches `APP_NAME`
- Version matches `APP_VERSION`
- Description matches `APP_DESCRIPTION`
- Docs URL is `/docs`
- Redoc URL is `/redoc`
- OpenAPI URL is `/openapi.json`
- CORS middleware is present
- Routes `/` and `/health` are registered

**`TestApplicationLifespan`** (2 tests):
- Lifespan context manager runs without error
- App serves requests after startup

**`TestApplicationIsolation`** (2 tests):
- Two calls to `create_application()` return different instances
- Both instances have the same configuration

---

## Test File: `tests/api/test_chat.py` (51 lines, 3 tests)

**Purpose**: Integration tests for chat endpoints.

| Test | What it does |
|------|-------------|
| `test_generate_chat` | Sends `POST /chat` with valid payload → verifies 200, response format, non-empty content |
| `test_stream_chat` | Sends `POST /chat/stream` → reads SSE stream → verifies SSE format, `[DONE]` sentinel |
| `test_chat_validation_error` | Sends `POST /chat` without `messages` → verifies 422, custom `APIError` format |

### Notable: Stream test

```python
async with async_client.stream("POST", "/chat/stream", json=payload) as response:
    assert response.status_code == 200
    chunks = []
    async for chunk in response.aiter_text():
        chunks.append(chunk)
    full_text = "".join(chunks)
    assert "data: {" in full_text
    assert "chat.completion.chunk" in full_text
    assert "data: [DONE]" in full_text
```

Uses httpx's streaming context manager to read the SSE stream chunk by chunk.

---

## Test File: `tests/api/test_models.py` (22 lines, 1 test)

```python
async def test_list_models(async_client):
    response = await async_client.get("/models")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert "total" in data
    assert len(data["models"]) == data["total"]
```

Simple but effective — verifies the models endpoint returns the expected shape.

---

## Test File: `tests/api/test_sessions.py` (36 lines, 3 tests)

| Test | What it verifies |
|------|-----------------|
| `test_create_session` | `POST /sessions` → 201, returns id and title |
| `test_list_sessions` | `GET /sessions` → 200, returns sessions and total |
| `test_delete_session` | Create → DELETE → 204 No Content |

---

## Test File: `tests/services/test_chat_service.py` (49 lines, 2 tests)

**Purpose**: Unit tests for `ChatService` — tests the service directly without HTTP.

```python
async def test_chat_service_generate():
    mock_session = MagicMock()
    service = ChatService(session=mock_session)
    request = ChatRequest(
        messages=[ChatMessage(role=RoleEnum.user, content="Hello")],
        model="test-model",
    )
    response = await service.generate_response(request)
    assert response.model == "test-model"
    assert response.message.role == RoleEnum.assistant
    assert response.object == "chat.completion"
```

Uses `unittest.mock.MagicMock` to create a fake database session. This means:
- No real database is used.
- `MessageRepository.create()` calls go to the mock (and do nothing).
- Tests the pure business logic of `ChatService` in isolation.

---

## Test Coverage Map

```
┌───────────────────────────────────────────────────────┐
│                    TESTED                               │
│                                                         │
│  ✅ Health endpoints (13 tests)                        │
│  ✅ Configuration loading (17 tests)                   │
│  ✅ Application factory (9 tests)                      │
│  ✅ Chat sync + streaming (3 tests)                    │
│  ✅ Models listing (1 test)                            │
│  ✅ Sessions CRUD (3 tests)                            │
│  ✅ ChatService unit (2 tests)                         │
│                                                         │
│  Total: ~48 tests                                      │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│                    NOT TESTED                           │
│                                                         │
│  ❌ Gateway routes (api/v1/*)                          │
│  ❌ API key generation + validation                    │
│  ❌ Knowledge upload + chunking                        │
│  ❌ Workflow creation + execution                      │
│  ❌ Memory node/connection CRUD                        │
│  ❌ Monitoring endpoint                                │
│  ❌ Settings CRUD                                      │
│  ❌ Logs endpoints                                     │
│  ❌ Benchmarks endpoint                                │
│  ❌ Repository custom methods                          │
│  ❌ Domain services (domain_services.py)               │
│  ❌ Seed script                                        │
└───────────────────────────────────────────────────────┘
```

---

## Running Tests

```bash
# Run all tests
pytest tests/ -v --tb=short

# Run a specific test file
pytest tests/test_health.py -v

# Run a specific test
pytest tests/test_health.py::test_health_returns_200 -v

# Run with output (see print statements)
pytest tests/ -v -s
```
