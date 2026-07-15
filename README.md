# 🧠 OpenMind AI Platform

<!-- TODO: Replace with actual GitHub repo URL for CI badge -->
[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-brightgreen.svg)]()

A production-grade AI platform built with **FastAPI**, designed for scalability, modularity, and clean software architecture. OpenMind AI provides the backend foundation for intelligent services — from chat interfaces to multi-model orchestration.

> **Current Release: v0.2.0 — API Contract Design**
> The platform now features stable public API contracts for the Chat, Models, and Sessions domains. These APIs return deterministic mock data and provide a robust foundation for the frontend team to begin concurrent development. The architecture introduces a decoupled Service Layer, standardizing request/response formats independent of any AI provider.

---

## ✨ Features

- **FastAPI Application Factory** — Clean, testable app creation via `create_application()`
- **Type-Safe Configuration** — Environment-driven settings validated at startup with Pydantic Settings
- **Structured Logging** — JSON and human-readable formats via `structlog`, production-ready for log aggregation
- **Health Monitoring** — `GET /health` endpoint for load balancers and container orchestrators
- **Interactive API Docs** — Auto-generated Swagger UI (`/docs`) and ReDoc (`/redoc`)
- **Multi-Stage Docker Build** — Lean production images with non-root user security
- **CI Pipeline** — Automated linting (Ruff), type checking (mypy), and testing (pytest)
- **CORS Middleware** — Configurable cross-origin request handling
- **Lifespan Management** — Async startup/shutdown hooks for resource lifecycle

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **pip** (or any Python package manager)
- **Docker** & **Docker Compose** (optional, for containerized development)

### Local Development

```bash
# Clone the repository
git clone <TODO: Insert actual repo URL>
cd openmind-ai-platform

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Start the development server
uvicorn app.main:app --reload
```

The API will be available at **http://localhost:8000**.

### 🐳 Docker

```bash
# Build and run (foreground)
docker compose up --build

# Run in background
docker compose up -d --build

# View logs
docker compose logs -f api

# Stop
docker compose down
```

---

## 🧪 Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run with short traceback
pytest tests/ -v --tb=short

# Run a specific test file
pytest tests/test_health.py -v

# Lint check
ruff check app/ tests/

# Format check
ruff format --check app/ tests/

# Type check
mypy app/ --ignore-missing-imports
```

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Root discovery endpoint — returns welcome message, version, and docs link |
| `GET` | `/health` | Health check — returns service status, version, environment, timestamp |
| `GET` | `/docs` | Interactive Swagger UI documentation |
| `GET` | `/redoc` | Alternative ReDoc documentation |
| `GET` | `/openapi.json` | Raw OpenAPI 3.1 schema |

> See [docs/api.md](docs/api.md) for complete request/response schemas and examples.

---

## 📁 Project Structure

```
openmind-ai-platform/
│
├── app/                        # Application source code
│   ├── api/                    # HTTP layer
│   │   ├── routes/             # Route handlers by domain
│   │   │   └── health.py       # Health & root endpoints
│   │   └── router.py           # Central router aggregator
│   ├── core/                   # Cross-cutting concerns
│   │   ├── config.py           # Pydantic Settings configuration
│   │   ├── lifespan.py         # Startup / shutdown lifecycle
│   │   └── logging.py          # Structured logging setup
│   ├── models/                 # Domain / ORM models (future)
│   ├── schemas/                # Pydantic request/response DTOs
│   │   └── health.py           # Health & root response schemas
│   ├── services/               # Business logic services (future)
│   ├── storage/                # Data persistence layer (future)
│   ├── utils/                  # Shared utilities
│   └── main.py                 # Application factory & entry point
│
├── tests/                      # Test suite
│   ├── conftest.py             # Shared fixtures (app, async_client)
│   ├── test_health.py          # Health & root endpoint tests
│   ├── test_config.py          # Configuration tests
│   └── test_application.py     # Application factory tests
│
├── docs/                       # Documentation
│   ├── architecture.md         # Architecture diagrams & design
│   ├── api.md                  # API reference
│   └── phase1-retrospective.md # Milestone 1 retrospective
│
├── benchmarks/                 # Performance benchmarks (future)
├── docker/                     # Additional Docker configs (future)
├── scripts/                    # Utility scripts
│   ├── start.sh                # Dev server launcher
│   └── run_tests.sh            # Test runner
├── .github/workflows/          # CI/CD pipelines
│   └── ci.yml                  # Lint + type check + test
│
├── Dockerfile                  # Multi-stage production image
├── docker-compose.yml          # Local development stack
├── requirements.txt            # Python dependencies
├── pyproject.toml              # Tool configuration (ruff, mypy, pytest)
├── .env.example                # Environment variable template
├── .dockerignore               # Docker build context exclusions
├── CHANGELOG.md                # Release history
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

---

## ⚙️ Configuration

All configuration is managed via environment variables, loaded through [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/). Copy `.env.example` to `.env` for local development.

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | `OpenMind AI Platform` | Application display name |
| `APP_VERSION` | `0.1.0` | Semantic version |
| `ENVIRONMENT` | `development` | `development` \| `staging` \| `production` |
| `DEBUG` | `false` | Enable debug mode |
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `8000` | Server port |
| `WORKERS` | `1` | Uvicorn worker count |
| `API_V1_PREFIX` | `/api/v1` | API version prefix |
| `LOG_LEVEL` | `INFO` | `DEBUG` \| `INFO` \| `WARNING` \| `ERROR` \| `CRITICAL` |
| `LOG_FORMAT` | `text` | `text` (dev) \| `json` (production) |
| `CORS_ORIGINS` | `["*"]` | Allowed CORS origins |

---

## 🏗️ Architecture

The platform follows a **layered architecture** with clear separation of concerns:

```
Clients (Web, Mobile, CLI)
        │
        ▼
   API Layer ─── Routes, Middleware, CORS
        │
        ▼
  Service Layer ─── Business Logic (future)
        │
        ▼
 Storage Layer ─── Persistence, Cache (future)
```

Each layer communicates only with the layer directly below it. See [docs/architecture.md](docs/architecture.md) for full diagrams and component relationships.

---

## 🛣️ Roadmap

| Phase | Milestone | Status | Description |
|-------|-----------|--------|-------------|
| 1 | M1: Backend Foundation | ✅ v0.1.0 | Project structure, config, health endpoints, Docker, CI |
| 1 | M2: API Contract Design | ✅ v0.2.0 | Chat/session request-response models, error handling |
| 1 | M3: Core Chat API | ⬜ | Chat endpoint, basic request/response flow |
| 2 | M4: LLM Integration | ⬜ | LLM service abstraction, provider routing |
| 2 | M5: Session Management | ⬜ | Multi-turn conversations, context persistence |
| 3 | M6: Production Hardening | ⬜ | Auth, rate limiting, monitoring, caching |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure all tests pass and linting is clean before submitting.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
