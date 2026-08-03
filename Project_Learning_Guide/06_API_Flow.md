# 06 — API Flow

How every API endpoint works — from HTTP request to response.

---

## How Endpoints Are Organized

All endpoints are organized in `app/api/routes/`, one file per domain. Each file defines a `router = APIRouter()` which is mounted in `app/api/router.py` with a URL prefix.

```
app/api/router.py
    ├── health.router       →  /         and /health
    ├── chat.router         →  /chat     and /chat/stream
    ├── models.router       →  /models
    ├── sessions.router     →  /sessions
    ├── gateway.router      →  /api/v1
    ├── knowledge.router    →  /knowledge
    ├── workflows.router    →  /workflows
    ├── memory.router       →  /memory
    ├── api_keys.router     →  /api-keys
    ├── monitoring.router   →  /api/status
    ├── logs.router         →  /logs
    ├── settings.router     →  /settings
    └── benchmarks.router   →  /benchmarks
```

---

## Endpoint Categories

### 1. Read-Only Endpoints (GET)

These only query the database and return data. They never modify state.

| Endpoint | Service Method | Repository Method | SQL |
|----------|---------------|-------------------|-----|
| `GET /` | — (direct) | — | None |
| `GET /health` | — (direct) | — | None |
| `GET /models` | `ModelService.list_models()` | `ModelRepository.get_all()` | `SELECT * FROM models` |
| `GET /sessions` | `SessionService.list_sessions()` | `SessionRepository.get_all_with_messages()` | `SELECT * FROM sessions` + `SELECT * FROM messages WHERE session_id IN (...)` |
| `GET /sessions/{id}` | `SessionService.get_session()` | `SessionRepository.get_with_messages()` | `SELECT * FROM sessions WHERE id=?` + messages |
| `GET /sessions/{id}/messages` | `SessionService.get_messages()` | `MessageRepository.get_by_session()` | `SELECT * FROM messages WHERE session_id=? ORDER BY created_at` |
| `GET /knowledge` | `KnowledgeService.list_sources()` | `KnowledgeRepository.get_all()` | `SELECT * FROM knowledge_sources` |
| `GET /workflows` | `WorkflowService.list_workflows()` | `WorkflowRepository.get_all_with_steps()` | `SELECT * FROM workflows` + steps |
| `GET /workflows/{id}` | `WorkflowService.get_workflow()` | `WorkflowRepository.get_with_steps()` | `SELECT ... WHERE id=?` + steps |
| `GET /memory/nodes` | `MemoryService.list_nodes()` | `MemoryNodeRepository.get_all()` | `SELECT * FROM memory_nodes` |
| `GET /memory/logs` | `MemoryService.list_logs()` | `MemoryLogRepository.get_recent()` | `SELECT * FROM memory_logs ORDER BY created_at DESC` |
| `GET /api-keys` | `ApiKeyService.list_keys()` | `ApiKeyRepository.get_all_active()` | `SELECT * FROM api_keys WHERE is_active=1` |
| `GET /api/status` | `MonitoringService.get_system_status()` | — | `SELECT 1` (health check) + `psutil` |
| `GET /logs/system` | `LogService.list_system_logs()` | `LogEntryRepository.get_recent()` | `SELECT * FROM log_entries ORDER BY created_at DESC` |
| `GET /logs/api` | `LogService.list_api_logs()` | `RequestLogRepository.get_recent()` | `SELECT * FROM request_logs ORDER BY created_at DESC` |
| `GET /settings` | `SettingsService.get_all()` | `SettingsRepository.get_all_as_dict()` | `SELECT * FROM system_settings` |
| `GET /benchmarks` | `BenchmarkService.list_benchmarks()` | `BenchmarkRepository.get_all()` | `SELECT * FROM benchmarks` |
| `GET /api/v1/models` | `ModelService.list_models()` | `ModelRepository.get_all()` | `SELECT * FROM models` |

### 2. Create Endpoints (POST)

These create new records in the database.

| Endpoint | Creates | Status |
|----------|---------|--------|
| `POST /chat` | 2 message records (if session_id) | 200 |
| `POST /chat/stream` | 2 message records (if session_id) | 200 (SSE) |
| `POST /models` | 1 model record | 201 |
| `POST /sessions` | 1 session record | 201 |
| `POST /sessions/{id}/messages` | 1 message record | 201 |
| `POST /knowledge` | 1 knowledge_source record | 201 |
| `POST /knowledge/upload` | 1 knowledge_source record + file on disk | 200 |
| `POST /workflows` | 1 workflow + N step records | 201 |
| `POST /workflows/{id}/execute` | Updates last_run field | 200 |
| `POST /memory/nodes` | 1 memory_node record | 201 |
| `POST /memory/logs` | 1 memory_log record | 201 |
| `POST /api-keys` | 1 api_key record | 201 |
| `POST /logs/system` | 1 log_entry record | 201 |
| `POST /api/v1/chat/completions` | 2 messages + 1 request_log | 200 |
| `POST /api/v1/embeddings` | 1 request_log | 200 |

### 3. Update Endpoints (PUT)

| Endpoint | What changes |
|----------|-------------|
| `PUT /models/{id}` | Updates non-None fields on a model record |
| `PUT /sessions/{id}` | Updates session title, model, temperature, etc. |
| `PUT /workflows/{id}` | Updates workflow name, description, etc. |
| `PUT /settings` | Upserts multiple key-value pairs |

### 4. Delete Endpoints (DELETE)

| Endpoint | What's deleted | Cascade |
|----------|---------------|---------|
| `DELETE /models/{id}` | 1 model record | No cascade |
| `DELETE /sessions/{id}` | 1 session + all its messages | CASCADE |
| `DELETE /knowledge/{id}` | 1 knowledge_source record | No cascade |
| `DELETE /workflows/{id}` | 1 workflow + all its steps | CASCADE |
| `DELETE /api-keys/{id}` | 1 api_key record | No cascade |
| `DELETE /logs/api` | ALL request_log records | Bulk delete |

All DELETE endpoints return HTTP 204 (No Content) with no response body, except `DELETE /logs/api` which returns the count of deleted records.

---

## Authentication

Only the **gateway routes** (`/api/v1/*`) require authentication:

```
POST /api/v1/chat/completions  →  Bearer token required
POST /api/v1/embeddings        →  Bearer token required
GET  /api/v1/models            →  No auth required
```

Authentication flow:
1. Client sends `Authorization: Bearer om_a1b2c3d4e5f6...`
2. `validate_bearer_token()` dependency extracts the token
3. Prefix (`om_a1b2c3d4`) used to find the record in `api_keys` table
4. `bcrypt.checkpw()` compares full token against stored hash
5. If invalid → HTTP 401

All other endpoints have **no authentication**. This is intentional for a development/internal tool but would need auth for production exposure.

---

## Response Formats

### Successful single-item response (200/201):
```json
{
    "id": "uuid-here",
    "name": "Model Name",
    "created_at": "2026-07-30T10:00:00Z",
    ...
}
```

### Successful list response (200):
```json
{
    "models": [...],
    "total": 7
}
```
Or for simpler endpoints, just an array: `[{...}, {...}]`

### Validation error (422):
```json
{
    "error_type": "validation_error",
    "message": "Request validation failed",
    "details": [
        {"loc": ["body", "messages"], "msg": "Field required", "type": "missing"}
    ]
}
```

### Not found (404):
```json
{
    "error_type": "not_found",
    "message": "Session not found",
    "details": null
}
```

### No content (204):
Empty body — used by all DELETE endpoints.

---

## Swagger UI

All endpoints are documented in FastAPI's auto-generated Swagger UI:

```
http://localhost:8000/docs     ← Interactive Swagger UI
http://localhost:8000/redoc    ← Alternative ReDoc UI
http://localhost:8000/openapi.json  ← Raw OpenAPI spec
```

Endpoints are grouped by tags (Chat, Models, Sessions, etc.) for easy navigation.
