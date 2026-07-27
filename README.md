# OpenMind AI Platform

**OpenMind AI Platform** is a full-stack, enterprise-grade application for model routing, LLM playground workspace management, agent workflow orchestration, graph memory storage, and document ingestion (RAG).

Built with **FastAPI (Python 3.11+)**, **SQLAlchemy 2.0 (Async)**, **SQLite / PostgreSQL**, and a **React 19 + TypeScript + Vite + TailwindCSS** single-page web dashboard.

---

## 🌟 Key Feature Modules

| Module | Description |
| ------ | ----------- |
| **Dashboard** | Overview of system metrics (CPU, Memory, VRAM, uptime), active models, ingested sources, and workflows |
| **Playground** | Multi-session AI chat interface with configurable temperature, top_p, max tokens, system prompts, and JSON mode |
| **API Explorer** | Postman-like API request builder and logger for testing platform endpoints |
| **Models** | Model registry for local & cloud AI models (Llama 3, DeepSeek R1, Gemini 2.0/3.5, GPT-4o, CLIP, BGE) |
| **Sessions** | Workspace session manager with persistent message history and settings |
| **Memory** | Graph-based memory network spanning Conversation, Semantic, and Long-Term tiers |
| **Knowledge** | Document ingestion pipeline supporting PDF, Markdown, and TXT upload with character chunking |
| **Orchestrator** | Multi-step agent workflow execution engine (LLM, Condition, API Call, Memory Fetch, Human Approval) |
| **Benchmarks** | Model comparison table (TTFT, TPS, latency, accuracy, VRAM usage, cost per 1k) |
| **Logs** | System event log viewer with severity filtering and hot replay triggers |
| **Settings** | Platform configuration and theme switcher (Sophisticated Dark, Slate Dark, Cyberpunk Light, etc.) |

---

## 📂 Project Directory Structure

```text
openmind-ai-platform/
├── app/                        # FastAPI Backend Application
│   ├── api/                    # API Route Handlers
│   │   ├── routes/             # Feature domain routes
│   │   │   ├── api_keys.py     # API key management
│   │   │   ├── benchmarks.py   # Benchmark data endpoints
│   │   │   ├── chat.py         # Chat completion & SSE streaming
│   │   │   ├── gateway.py      # OpenAI-compatible API gateway
│   │   │   ├── health.py       # Health check & root endpoints
│   │   │   ├── knowledge.py    # Document upload & knowledge sources
│   │   │   ├── logs.py         # System log viewer endpoints
│   │   │   ├── memory.py       # Memory graph nodes & logs
│   │   │   ├── models.py       # AI model registry CRUD
│   │   │   ├── monitoring.py   # Real system status & metrics
│   │   │   ├── sessions.py     # Playground chat sessions
│   │   │   ├── settings.py     # System configuration settings
│   │   │   └── workflows.py    # Workflow definitions & step execution
│   │   └── router.py           # Central APIRouter mounting all routes
│   ├── core/                   # Core Infrastructure
│   │   ├── config.py           # Pydantic environment settings
│   │   ├── database.py         # Async SQLAlchemy engine & session factory
│   │   ├── lifespan.py         # App startup/shutdown lifespan manager
│   │   ├── logging.py          # Structlog configuration
│   │   └── seed.py             # Idempotent database seed script
│   ├── models/                 # SQLAlchemy ORM Models
│   │   ├── api_key.py          # ApiKeyRecord
│   │   ├── base.py             # Base model, TimestampMixin, UUIDMixin
│   │   ├── benchmark.py        # BenchmarkRecord
│   │   ├── knowledge.py        # KnowledgeSourceRecord
│   │   ├── log_entry.py        # LogEntryRecord
│   │   ├── memory.py           # MemoryNodeRecord, MemoryConnectionRecord
│   │   ├── memory_log.py       # MemoryLogRecord
│   │   ├── model.py            # ModelRecord
│   │   ├── request_log.py      # RequestLogRecord
│   │   ├── session.py          # SessionRecord, MessageRecord
│   │   ├── setting.py          # SystemSettingRecord
│   │   └── workflow.py         # WorkflowRecord, WorkflowStepRecord
│   ├── schemas/                # Pydantic DTOs & Validation Schemas
│   │   ├── chat.py             # ChatRequest, ChatResponse, ChatStreamResponse
│   │   ├── errors.py           # APIError standard response
│   │   ├── health.py           # HealthResponse
│   │   ├── models.py           # ModelCreateRequest, ModelUpdateRequest, ModelMetadata
│   │   └── sessions.py         # SessionCreateRequest, SessionUpdateRequest, MessageCreateRequest
│   ├── services/               # Domain Business Logic
│   │   ├── api_key_service.py  # API key generation & fast prefix lookup
│   │   ├── chat_service.py     # Gemini AI integration, SSE streaming, token counting
│   │   ├── domain_services.py  # Knowledge, Workflow, Memory, Log, Settings, Benchmark services
│   │   ├── model_service.py    # Model registry service
│   │   ├── monitoring_service.py # System status & resource monitoring
│   │   └── session_service.py  # Session & message history service
│   └── storage/                # Repository Pattern Data Access Layer
│       ├── api_key_repository.py
│       ├── base_repository.py  # Generic Async CRUD BaseRepository
│       ├── knowledge_repository.py
│       ├── memory_repository.py
│       ├── misc_repositories.py
│       ├── model_repository.py
│       ├── request_log_repository.py
│       ├── session_repository.py
│       └── workflow_repository.py
├── client/                     # React 19 + TypeScript Frontend
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts       # Type-safe API client targeting Vite proxy
│   │   ├── components/         # 11 Feature View Components
│   │   ├── App.tsx             # Main App layout, router & backend data sync
│   │   ├── data.ts             # Initial fallback data
│   │   └── types.ts            # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts          # Vite config with backend proxy on port 8000
├── tests/                      # Pytest Suite (59 tests)
│   ├── api/                    # API integration tests (chat, models, sessions)
│   ├── services/               # Unit tests for domain services
│   └── conftest.py             # Shared AsyncClient fixtures
├── docker-compose.yml          # Production Docker Compose config
├── Dockerfile                  # Multi-stage production build
├── requirements.txt            # Python dependencies
└── pyproject.toml              # Pytest, Ruff, and Mypy configuration
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- *(Optional)* **Docker & Docker Compose** (for PostgreSQL)

---

### 2. Backend Setup

1. **Create and Activate Virtual Environment:**
   ```bash
   python -m venv .venv
   
   # Windows (PowerShell)
   .\.venv\Scripts\Activate.ps1
   
   # Linux / macOS
   source .venv/bin/activate
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API Key in `.env`:
   ```ini
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(By default, `DATABASE_URL` uses local SQLite `sqlite+aiosqlite:///./openmind.db` for zero-setup execution).*

4. **Initialize and Seed Database:**
   ```bash
   python -m app.core.seed
   ```

5. **Start the FastAPI Server:**
   ```bash
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   - **Backend API**: `http://localhost:8000`
   - **Interactive API Docs (Swagger)**: `http://localhost:8000/docs`

---

### 3. Frontend Setup

In a new terminal window:

1. **Navigate to the `client/` Directory:**
   ```bash
   cd client
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Vite Dev Server:**
   ```bash
   npm run dev
   ```
   - **Frontend App**: `http://localhost:3000`

---

## 🔌 API Endpoints Summary

### OpenAI-Compatible Gateway (`/api/v1`)
- `POST /api/v1/chat/completions` — OpenAI-compatible chat completion (with Bearer token auth)
- `POST /api/v1/embeddings` — OpenAI-compatible text embeddings
- `GET /api/v1/models` — OpenAI-compatible model listing

### Core Domain APIs
- `POST /chat` & `POST /chat/stream` — Main chat completions & SSE streaming
- `GET /models`, `POST /models`, `PUT /models/{id}`, `DELETE /models/{id}` — Model registry CRUD
- `GET /sessions`, `POST /sessions`, `GET /sessions/{id}`, `PUT /sessions/{id}`, `DELETE /sessions/{id}` — Sessions
- `GET /knowledge`, `POST /knowledge/upload`, `DELETE /knowledge/{id}` — Document ingestion
- `GET /workflows`, `POST /workflows`, `POST /workflows/{id}/execute` — Workflow orchestration
- `GET /memory/nodes`, `POST /memory/nodes`, `GET /memory/logs` — Graph memory
- `GET /api-keys`, `POST /api-keys`, `DELETE /api-keys/{id}` — API Key management
- `GET /api/status` — Real-time CPU, GPU VRAM, Memory, and DB monitoring

---

## 🧪 Running Tests

Run the backend pytest suite (59 unit and integration tests):

```bash
python -m pytest
```

---

## 📜 License

MIT License. Developed for the **OpenMind AI Platform**.
