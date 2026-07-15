# Changelog

All notable changes to the OpenMind AI Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-07-15

### Added
- **API Contracts**: Introduced robust Pydantic schemas for the Chat, Models, and Sessions domains.
- **Service Layer**: Created decoupled `ChatService`, `ModelService`, and `SessionService` returning deterministic mock data.
- **Chat Domain**: `POST /chat` (blocking) and `POST /chat/stream` (Server-Sent Events streaming).
- **Models Domain**: `GET /models` endpoint for AI model discovery.
- **Sessions Domain**: `POST /sessions`, `GET /sessions`, and `DELETE /sessions/{session_id}` for conversation management.
- **Error Handling**: Implemented a global exception handler ensuring all endpoints return a standardized `APIError` schema.
- **Testing**: Added comprehensive integration tests for all new endpoints and services.

## [0.1.0] — 2026-07-09

### Added

- **FastAPI Application Factory** — `create_application()` with explicit middleware and router wiring
- **Configuration System** — Pydantic Settings with environment variable binding, `.env` support, and `@lru_cache` singleton
- **Structured Logging** — `structlog` integration with JSON and text output formats, configurable via `LOG_FORMAT`
- **Health Endpoint** — `GET /health` returning status, version, environment, and UTC timestamp for load balancer and orchestrator probes
- **Root Endpoint** — `GET /` returning welcome message, version, and documentation link
- **Response Schemas** — `HealthResponse` and `RootResponse` Pydantic models with field descriptions and examples
- **CORS Middleware** — Configurable cross-origin request handling via `CORS_ORIGINS`
- **Lifespan Management** — Async startup/shutdown lifecycle via FastAPI lifespan context manager
- **Multi-Stage Dockerfile** — Builder + runtime stages, non-root user, health check, Python optimizations
- **Docker Compose** — Local development stack with live-reload, resource limits, and log rotation
- **CI Pipeline** — GitHub Actions with Ruff linting, Ruff formatting, mypy type checking, and pytest across Python 3.12 and 3.13
- **Test Suite** — Comprehensive tests for health endpoints, configuration, and application factory
- **Architecture Documentation** — Mermaid diagrams for request flow, startup, components, and folder structure
- **API Documentation** — Complete endpoint reference with schemas, status codes, and examples
- **Phase 1 Retrospective** — Design decisions, lessons learned, and Milestone 2 goals
- **.dockerignore** — Optimized Docker build context excluding dev and test files
- **Project Configuration** — `pyproject.toml` with Ruff, mypy, and pytest settings

[0.1.0]: <TODO: Insert actual repo release URL>
