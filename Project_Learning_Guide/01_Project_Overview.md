# 01 — Project Overview

## What Is the OpenMind AI Platform?

OpenMind AI Platform is a **full-stack web application** that serves as a command center for managing, testing, and deploying AI models. Think of it as your own private "AI operations dashboard" — similar to what companies like OpenAI, Hugging Face, or Google AI Studio provide, but one that **you** built and control.

---

## What Problem Does It Solve?

When you work with AI/LLM models, you face several challenges:

1. **Model Management**: You might use Llama 3 locally, Gemini from Google Cloud, and GPT-4o from OpenAI. You need one place to register, track, and compare them.
2. **Chat Testing**: You need a playground to test prompts against different models with different parameters (temperature, max_tokens, etc.).
3. **API Gateway**: External applications want to call your models using the same OpenAI-compatible API format (`/chat/completions`). You need a gateway that authenticates requests and routes them.
4. **Knowledge Management**: You want to upload documents (PDFs, Markdown files) and chunk them for use with RAG (Retrieval-Augmented Generation).
5. **Memory**: You want your AI to "remember" things across conversations — a graph-based memory system with different tiers (short-term, semantic, long-term).
6. **Workflows**: You want to automate multi-step AI workflows — like "parse error → search memory → generate fix → request approval."
7. **Monitoring**: You need real-time metrics — CPU usage, memory, database health, uptime.
8. **Logging**: You need to see what's happening in your system and what API requests are being made.

**OpenMind solves all of these.** It's a single platform with a beautiful React dashboard and a robust Python/FastAPI backend.

---

## Who Is This Project For?

This project is designed for:

- **AI Engineers** who want a self-hosted platform to manage their models and workflows
- **Developers** who want a production-grade example of a full-stack FastAPI + React application
- **Teams** who want an internal tool for AI model testing and management

---

## Technology Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11+ | Programming language |
| **FastAPI** | 0.115.12 | Web framework (async, fast, auto-docs) |
| **Uvicorn** | 0.34.3 | ASGI server (runs the FastAPI app) |
| **SQLAlchemy** | 2.0.41 | ORM (Object-Relational Mapping) for database access |
| **Pydantic** | 2.11.3 | Data validation (request/response schemas) |
| **pydantic-settings** | 2.9.1 | Environment variable management |
| **structlog** | 25.4.0 | Structured logging |
| **google-generativeai** | 0.8.5 | Google Gemini AI SDK |
| **bcrypt** | 4.3.0 | API key hashing |
| **psutil** | 7.0.0 | System monitoring (CPU, RAM) |
| **aiosqlite** | 0.21.0 | Async SQLite driver (used in development) |
| **asyncpg** | 0.30.0 | Async PostgreSQL driver (used in production) |
| **httpx** | 0.28.1 | Async HTTP client |
| **python-multipart** | 0.0.20 | File upload handling |
| **pymupdf** | 1.25.5 | PDF parsing |
| **alembic** | 1.16.2 | Database migrations (installed but not actively used yet) |
| **pgvector** | 0.3.6 | Vector database extension (installed but not actively used yet) |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.0.1 | UI library |
| **TypeScript** | 5.8.2 | Type-safe JavaScript |
| **Vite** | 6.2.3 | Build tool and dev server |
| **TailwindCSS** | 4.1.14 | Utility-first CSS framework |
| **lucide-react** | 0.546.0 | Icon library |
| **motion** | 12.23.24 | Animation library (Framer Motion) |

### Development Tools
| Tool | Purpose |
|------|---------|
| **pytest** | Testing framework |
| **pytest-asyncio** | Async test support |
| **ruff** | Linter and formatter |
| **mypy** | Static type checker |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **GitHub Actions** | CI/CD pipeline |
| **PostgreSQL 16** | Production database |
| **SQLite** | Development database |
| **pgAdmin** | Database administration UI |

---

## Current Status (v0.2.0)

### ✅ Implemented
- Full backend API with 40+ endpoints
- React 19 frontend with 11 feature views
- Chat completions with real Gemini AI integration
- SSE (Server-Sent Events) streaming for real-time chat
- OpenAI-compatible API gateway with Bearer token auth
- Database persistence (SQLite/PostgreSQL) with async SQLAlchemy
- Model registry CRUD
- Session management with message history
- Knowledge document upload and chunking
- Workflow definitions with step execution
- Memory graph (nodes + connections)
- API key management with bcrypt hashing
- System monitoring (CPU, RAM, DB health)
- Structured logging
- Database seed script
- Docker + Docker Compose setup
- CI/CD pipeline (GitHub Actions)
- 59+ passing tests

### 🚧 Partially Implemented / Planned
- Alembic database migrations (dependency installed, not configured)
- pgvector for vector embeddings (dependency installed, not used)
- Real embedding generation (placeholder returns `[0.0] * 1024`)
- GPU/VRAM monitoring (frontend shows it, backend doesn't report real GPU data)
- Workflow execution is simulated (not actually calling external APIs)

---

## How the Application Runs

```
┌──────────────────────────────────────────────────────────┐
│                     User's Browser                        │
│              http://localhost:3000                         │
└─────────────────────────┬────────────────────────────────┘
                          │  HTTP Requests
                          ▼
┌──────────────────────────────────────────────────────────┐
│              Vite Dev Server (Port 3000)                   │
│    Serves React SPA + Proxies API calls to :8000          │
└─────────────────────────┬────────────────────────────────┘
                          │  Proxied Requests
                          ▼
┌──────────────────────────────────────────────────────────┐
│            FastAPI / Uvicorn (Port 8000)                   │
│    Handles all API logic, database, Gemini AI calls       │
└─────────────────────────┬────────────────────────────────┘
                          │  SQL Queries
                          ▼
┌──────────────────────────────────────────────────────────┐
│      SQLite (openmind.db) or PostgreSQL (docker)          │
└──────────────────────────────────────────────────────────┘
```

1. **You open `http://localhost:3000`** in your browser
2. **Vite** serves the React app (HTML, JS, CSS)
3. **React makes API calls** (like `GET /models`) — these go to `localhost:3000` first
4. **Vite proxies** these calls to the FastAPI backend at `localhost:8000`
5. **FastAPI processes** the request, queries the database, maybe calls Gemini AI
6. **Response flows back** through the same chain to your browser

---

## Key Concepts to Understand Before Diving In

### 1. FastAPI Dependency Injection
FastAPI's `Depends()` mechanism is used **everywhere** in this project. Instead of creating database connections manually, you declare what you need and FastAPI provides it:

```python
# Instead of this:
@router.get("/models")
async def list_models():
    session = create_session()  # Manual creation
    ...

# You do this:
@router.get("/models")
async def list_models(session: AsyncSession = Depends(get_db)):
    ...  # FastAPI automatically creates and provides the session
```

### 2. Repository Pattern
Database access is never done directly in route handlers. Instead, there are "repository" classes that wrap all database operations:

```
Route Handler  →  Service  →  Repository  →  Database
     ↑                                          │
     └──────────── Response flows back ─────────┘
```

### 3. Async/Await
The entire backend is **asynchronous**. Every database query, every HTTP call, every file operation uses `async`/`await`. This means the server can handle many requests simultaneously without blocking.

### 4. Pydantic Models vs SQLAlchemy Models
There are **two kinds of models** in this project — a common source of confusion:

- **SQLAlchemy Models** (in `app/models/`): Define database tables. Example: `ModelRecord` maps to the `models` table.
- **Pydantic Models** (in `app/schemas/`): Define API request/response shapes. Example: `ChatRequest` validates incoming chat data.

They are **separate** on purpose. The database structure should not be directly exposed to API clients.

### 5. SSE (Server-Sent Events)
The chat streaming feature uses SSE — a protocol where the server sends data to the client as it becomes available:

```
Client sends POST /chat/stream
Server responds with Content-Type: text/event-stream
Server streams: data: {"chunk": "Hello"}\n\n
Server streams: data: {"chunk": " world"}\n\n
Server streams: data: [DONE]\n\n
```

---

## Differences Between DEVELOPER_GUIDE.md and Actual Code

> The DEVELOPER_GUIDE.md is generally accurate, but there are a few discrepancies:

| Topic | DEVELOPER_GUIDE.md Says | Actual Code |
|-------|------------------------|-------------|
| `config.py` DEBUG default | `DEBUG: bool = True` | `DEBUG: bool = False` (line 30 of config.py) |
| `config.py` import | `from pydantic_settings import BaseSettings, SettingsConfigDict` | Uses `from pydantic_settings import BaseSettings` and `model_config = {...}` dict directly (not `SettingsConfigDict`) |
| `base.py` TimestampMixin | Uses `default=lambda: datetime.now(UTC)` | Uses `server_default=func.now()` (server-side default, which is more correct for databases) |
| `base.py` UUIDMixin | `String(36)` column type | No explicit `String(36)` — uses default `mapped_column(primary_key=True)` |
| `workflow_steps` column | `order_index` | Actual column name is `order` |
| CI Python versions | `3.12 and 3.13` | Actually `3.11 and 3.12` |
| Test count | "59 Passing Tests" | This depends on the current state; the actual number may differ |
