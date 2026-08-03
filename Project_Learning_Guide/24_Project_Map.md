# 24 — Project Map

Quick-reference map of every file in the repository and what it does. Use this when you need to find something fast.

---

## Root Directory

| File | Purpose |
|------|---------|
| `README.md` | Public GitHub README — project overview and quick start |
| `CHANGELOG.md` | Version history (v0.1.0, v0.2.0) |
| `DEVELOPER_GUIDE.md` | Reference developer guide (gitignored) |
| `requirements.txt` | Python dependencies (pinned versions) |
| `pyproject.toml` | Pytest, Ruff, and Mypy configuration |
| `.env.example` | Template for environment variables |
| `.env` | **Your** environment variables (gitignored) |
| `Dockerfile` | Multi-stage Docker build for production |
| `docker-compose.yml` | Docker Compose for PostgreSQL + pgAdmin + API |
| `.gitignore` | Files excluded from Git |
| `.dockerignore` | Files excluded from Docker build context |

---

## `app/` — Backend Application

### `app/core/` — Infrastructure

| File | Purpose | Key exports |
|------|---------|-------------|
| `__init__.py` | Package marker | — |
| `config.py` | Environment config via pydantic-settings | `Settings`, `get_settings()` |
| `database.py` | Async SQLAlchemy engine + session factory | `engine`, `async_session_factory`, `get_db()` |
| `lifespan.py` | Startup/shutdown lifecycle | `lifespan()` |
| `logging.py` | Structlog configuration | `setup_logging()` |
| `seed.py` | Database seeder (idempotent) | `run_seed()` |

### `app/models/` — Database Tables (SQLAlchemy ORM)

| File | Table(s) | Key class(es) |
|------|----------|---------------|
| `__init__.py` | — | Imports all models for `create_all()` |
| `base.py` | — | `Base`, `UUIDMixin`, `TimestampMixin` |
| `model.py` | `models` | `ModelRecord` |
| `session.py` | `sessions`, `messages` | `SessionRecord`, `MessageRecord` |
| `api_key.py` | `api_keys` | `ApiKeyRecord` |
| `knowledge.py` | `knowledge_sources` | `KnowledgeSourceRecord` |
| `workflow.py` | `workflows`, `workflow_steps` | `WorkflowRecord`, `WorkflowStepRecord` |
| `memory.py` | `memory_nodes`, `memory_connections` | `MemoryNodeRecord`, `MemoryConnectionRecord` |
| `memory_log.py` | `memory_logs` | `MemoryLogRecord` |
| `benchmark.py` | `benchmarks` | `BenchmarkRecord` |
| `log_entry.py` | `log_entries` | `LogEntryRecord` |
| `request_log.py` | `request_logs` | `RequestLogRecord` |
| `setting.py` | `system_settings` | `SystemSettingRecord` |

### `app/schemas/` — API Request/Response Models (Pydantic)

| File | Key classes |
|------|-------------|
| `__init__.py` | Package marker |
| `chat.py` | `RoleEnum`, `ChatMessage`, `TokenUsage`, `ChatRequest`, `ChatResponse`, `ChatStreamResponse` |
| `errors.py` | `ErrorDetail`, `APIError` |
| `health.py` | `HealthResponse`, `RootResponse` |
| `models.py` | `ModelCreateRequest`, `ModelUpdateRequest`, `ModelMetadata`, `ModelListResponse` |
| `sessions.py` | `SessionCreateRequest`, `SessionUpdateRequest`, `MessageCreateRequest`, `SessionResponse`, `SessionListResponse` |

### `app/services/` — Business Logic

| File | Key class(es) | Responsibilities |
|------|---------------|-----------------|
| `__init__.py` | — | Package marker |
| `chat_service.py` | `ChatService` | Gemini AI calls, SSE streaming, message persistence |
| `session_service.py` | `SessionService` | Session CRUD, message history |
| `model_service.py` | `ModelService` | Model registry CRUD |
| `api_key_service.py` | `ApiKeyService` | Key generation, bcrypt hashing, prefix validation |
| `monitoring_service.py` | `MonitoringService` | CPU/RAM metrics, DB health check |
| `domain_services.py` | `KnowledgeService`, `WorkflowService`, `MemoryService`, `LogService`, `SettingsService`, `BenchmarkService` | Six smaller domain services |

### `app/storage/` — Data Access (Repositories)

| File | Key class(es) | Custom methods |
|------|---------------|----------------|
| `__init__.py` | — | Exports all repositories |
| `base_repository.py` | `BaseRepository[T]` | `get_by_id`, `get_all`, `create`, `update`, `delete`, `count` |
| `model_repository.py` | `ModelRepository` | None (inherits all from Base) |
| `session_repository.py` | `SessionRepository`, `MessageRepository` | `get_with_messages`, `get_all_with_messages`, `get_by_session` |
| `api_key_repository.py` | `ApiKeyRepository` | `get_all_active`, `get_by_prefix` |
| `knowledge_repository.py` | `KnowledgeRepository` | None |
| `workflow_repository.py` | `WorkflowRepository`, `WorkflowStepRepository` | `get_with_steps`, `get_all_with_steps` |
| `memory_repository.py` | `MemoryNodeRepository`, `MemoryConnectionRepository` | `get_by_tier`, `get_connections_for_node` |
| `request_log_repository.py` | `RequestLogRepository` | `get_recent`, `delete_all` |
| `misc_repositories.py` | `BenchmarkRepository`, `LogEntryRepository`, `MemoryLogRepository`, `SettingsRepository` | `get_recent`, `get_by_key`, `upsert`, `get_all_as_dict` |

### `app/api/` — HTTP Routes

| File | Prefix | Endpoints |
|------|--------|-----------|
| `router.py` | — | Mounts all 13 route modules |
| `errors.py` | — | Exception handlers (422, 404, 500) |
| `routes/health.py` | `/`, `/health` | `GET /`, `GET /health` |
| `routes/chat.py` | `/chat` | `POST /chat`, `POST /chat/stream` |
| `routes/models.py` | `/models` | `GET`, `POST`, `PUT /{id}`, `DELETE /{id}` |
| `routes/sessions.py` | `/sessions` | `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`, `GET /{id}/messages`, `POST /{id}/messages` |
| `routes/gateway.py` | `/api/v1` | `POST /chat/completions`, `POST /embeddings`, `GET /models` |
| `routes/knowledge.py` | `/knowledge` | `GET`, `POST`, `POST /upload`, `DELETE /{id}` |
| `routes/workflows.py` | `/workflows` | `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/execute` |
| `routes/memory.py` | `/memory` | `GET /nodes`, `POST /nodes`, `GET /logs`, `POST /logs` |
| `routes/api_keys.py` | `/api-keys` | `GET`, `POST`, `DELETE /{id}` |
| `routes/monitoring.py` | `/api/status` | `GET /api/status` |
| `routes/logs.py` | `/logs` | `GET /system`, `POST /system`, `GET /api`, `DELETE /api` |
| `routes/settings.py` | `/settings` | `GET`, `PUT` |
| `routes/benchmarks.py` | `/benchmarks` | `GET` |

---

## `client/` — Frontend Application

| File | Purpose |
|------|---------|
| `index.html` | HTML entry point (contains `<div id="root">`) |
| `package.json` | NPM dependencies and scripts |
| `vite.config.ts` | Vite configuration (proxy, plugins, aliases) |
| `tsconfig.json` | TypeScript compiler options |
| `src/main.tsx` | React DOM render entry point |
| `src/App.tsx` | Main component (state, layout, navigation, API loading) |
| `src/index.css` | Global styles (fonts, scrollbars, Tailwind import) |
| `src/types.ts` | TypeScript interfaces for all data types |
| `src/data.ts` | Fallback mock data (used when backend is unavailable) |
| `src/api/client.ts` | API client (all fetch calls, SSE streaming) |
| `src/components/Dashboard.tsx` | System overview metrics dashboard |
| `src/components/Playground.tsx` | Multi-session chat interface |
| `src/components/ApiExplorer.tsx` | Postman-like API tester |
| `src/components/Models.tsx` | Model registry manager |
| `src/components/Sessions.tsx` | Session list manager |
| `src/components/Memory.tsx` | Graph memory visualizer |
| `src/components/Knowledge.tsx` | Document upload manager |
| `src/components/Orchestrator.tsx` | Workflow builder |
| `src/components/Benchmarks.tsx` | Performance comparison table |
| `src/components/Logs.tsx` | System log viewer |
| `src/components/Settings.tsx` | Configuration and theme switcher |

---

## `tests/` — Test Suite

| File | What it tests |
|------|--------------|
| `conftest.py` | Shared fixtures: `app`, `async_client` |
| `test_application.py` | App factory, middleware, lifespan |
| `test_config.py` | Settings defaults, validation, overrides, caching |
| `test_health.py` | Root and health endpoints, OpenAPI schema, 404s |
| `api/test_chat.py` | Chat sync, streaming, validation errors |
| `api/test_models.py` | Model listing endpoint |
| `api/test_sessions.py` | Session create, list, delete |
| `services/test_chat_service.py` | ChatService generate and stream (unit test) |

---

## Scripts

| File | Purpose |
|------|---------|
| `scripts/start.sh` | Start the dev server with uvicorn |
| `scripts/run_tests.sh` | Run pytest suite |

---

## CI/CD

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | GitHub Actions: lint (Ruff), type check (mypy), test (pytest) on Python 3.11 + 3.12 |
