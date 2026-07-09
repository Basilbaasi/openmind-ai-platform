# Phase 1 Retrospective — Backend Foundation (v0.1.0)

> **Milestone:** M1 — Backend Foundation
> **Release:** v0.1.0
> **Date:** July 2026

---

## What Was Built

### Core Infrastructure
- **FastAPI Application Factory** — `create_application()` function producing a fully configured ASGI app with middleware, routers, and lifespan management
- **Pydantic Settings Configuration** — Type-safe, environment-variable-driven configuration with validation at startup. Cached singleton via `@lru_cache`
- **Structured Logging** — `structlog`-based logging supporting both human-readable (text) and machine-parseable (JSON) output formats
- **Lifespan Management** — Async context manager for startup/shutdown lifecycle, following FastAPI's recommended pattern over deprecated `@app.on_event` decorators

### API Layer
- **Root Endpoint** (`GET /`) — Discovery endpoint returning app name, version, and docs link
- **Health Endpoint** (`GET /health`) — Liveness probe returning status, version, environment, and UTC timestamp
- **Response Schemas** — `HealthResponse` and `RootResponse` Pydantic models with field descriptions and examples

### DevOps
- **Multi-Stage Dockerfile** — Builder + runtime stages with non-root user, health check, and Python optimizations
- **Docker Compose** — Single-command local development with live-reload, resource limits, and log rotation
- **CI Pipeline** — GitHub Actions workflow with linting (Ruff), formatting, type checking (mypy), and testing (pytest) across Python 3.12/3.13
- **.dockerignore** — Optimized Docker build context

### Documentation
- **README.md** — Professional open-source README with badges, features, setup instructions, API reference, config table, and roadmap
- **Architecture Document** — Mermaid diagrams for request flow, startup sequence, component relationships, and folder architecture
- **API Reference** — Complete endpoint documentation with schemas, status codes, and curl examples
- **CHANGELOG.md** — Keep a Changelog format release history

### Testing
- **Test Infrastructure** — pytest + pytest-asyncio with HTTPX async client fixtures
- **Health/Root Tests** — Response status, schema validation, content-type, semver format, method enforcement, ISO timestamps
- **Configuration Tests** — Default values, Literal constraints, overrides, singleton caching
- **Application Tests** — Factory function, middleware presence, route registration, lifespan execution, instance isolation

---

## Design Decisions

### 1. Application Factory Pattern
**Decision:** Use `create_application()` instead of module-level `app = FastAPI()`.

**Rationale:** Enables test isolation (each test gets a fresh app), supports multiple ASGI servers, and makes all wiring explicit in one function.

### 2. Pydantic Settings for Configuration
**Decision:** Use `pydantic-settings` with `@lru_cache` singleton.

**Rationale:** Provides type validation at startup (fail-fast), environment variable binding, `.env` file support, and IDE autocompletion. The `@lru_cache` ensures the settings are loaded once and shared.

### 3. structlog for Logging
**Decision:** Use `structlog` instead of Python's built-in `logging`.

**Rationale:** Structured key-value logging is essential for production log aggregation (ELK, Datadog, CloudWatch). The dual-format support (text for dev, JSON for prod) is configured via environment variable.

### 4. FastAPI Lifespan over Event Decorators
**Decision:** Use `@asynccontextmanager` lifespan instead of `@app.on_event("startup")`.

**Rationale:** `on_event` is deprecated in FastAPI. The lifespan context manager provides cleaner resource lifecycle management with guaranteed cleanup.

### 5. Layered Architecture
**Decision:** Separate app into `api/`, `services/`, `models/`, `schemas/`, `storage/` packages.

**Rationale:** Even though only `api/` and `schemas/` are active in v0.1.0, establishing the full layer structure now ensures the project scales without reorganization.

### 6. Schemas Separate from Routes
**Decision:** Keep Pydantic response models in `schemas/` rather than inline in route handlers.

**Rationale:** Clean API contract, easier versioning, reusable across multiple endpoints, and clear separation between HTTP handling and data shape.

---

## Lessons Learned

### What Went Well
1. **Configuration validation saved debugging time** — Pydantic catches typos and type mismatches at startup, not at request time
2. **Test infrastructure ROI** — Investing in proper fixtures (async_client, app factory) made writing tests fast and reliable
3. **Docker multi-stage build** — Keeps the production image lean (~150MB) while the builder has all compilation tools
4. **Structured logging from day one** — No need to retrofit later; log format is switchable via a single env var

### What Could Improve
1. **Dev dependency separation** — `requirements.txt` mixes runtime and dev dependencies. Consider `requirements-dev.txt` or `pyproject.toml` `[project.optional-dependencies]` for Milestone 2
2. **Pre-commit hooks** — Should add `.pre-commit-config.yaml` to enforce formatting/linting before commits
3. **Coverage reporting** — Tests run but don't track code coverage. Add `pytest-cov` in Milestone 2

---

## Current Limitations

| Limitation | Impact | Planned Resolution |
|-----------|--------|-------------------|
| No persistence layer | Cannot store data between requests | M3: Database integration |
| No authentication | All endpoints are publicly accessible | M6: Auth middleware |
| No rate limiting | Vulnerable to abuse | M6: Rate limiting middleware |
| Single-process server | Limited concurrency | M6: Multi-worker deployment |
| No error standardization | Default FastAPI error responses | M2: Standardized error schemas |
| No request validation | No request bodies yet | M2: API contract design |
| No health dependency checks | Health check is synthetic (always "healthy") | M4+: Check DB, cache, LLM connectivity |

---

## Goals for Milestone 2 — API Contract Design

### Deliverables
1. **Standardized Error Handling** — Consistent error response schema with error codes, messages, and details
2. **Chat Request/Response Models** — Pydantic schemas for chat interactions (without implementation)
3. **Session Models** — Pydantic schemas for session lifecycle
4. **API Versioning Strategy** — Implement `/api/v1/` prefix routing
5. **Request Validation** — Input validation patterns and custom validators
6. **Response Envelope** — Standard response wrapper (data, metadata, errors)

### Success Criteria
- All API contracts are defined as Pydantic models with full documentation
- OpenAPI schema accurately reflects the planned API surface
- No actual business logic or LLM integration — contracts only
- All new schemas have corresponding tests
- Documentation is updated with the complete API surface
