# 02 — Architecture

## The Big Picture

OpenMind follows a **Layered Architecture** (also called **Clean Architecture** or **Service-Repository Pattern**). This means the code is organized into horizontal layers, where each layer has a specific responsibility and only talks to the layers directly above or below it.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: CLIENT (React Frontend)                  │
│                                                                      │
│   App.tsx ──→ 11 Component Views ──→ client.ts (API calls)          │
│   User clicks buttons → React calls backend API → Updates UI        │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │  HTTP (Vite proxy: :3000 → :8000)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 2: API (FastAPI Routes)                     │
│                                                                      │
│   router.py ──→ 13 Route Modules ──→ Pydantic Validation           │
│   Receives HTTP, validates input, calls service, returns response    │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │  Python function calls
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 3: SERVICES (Business Logic)                │
│                                                                      │
│   ChatService / ModelService / SessionService / etc.                 │
│   Contains ALL business logic, AI calls, data transformation        │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │  Repository method calls
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 4: STORAGE (Repositories)                   │
│                                                                      │
│   BaseRepository[T] ──→ ModelRepository / SessionRepository / etc.  │
│   Wraps all database queries. ONLY place SQL lives.                  │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │  SQLAlchemy async queries
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 5: PERSISTENCE (Database + External)        │
│                                                                      │
│   SQLite (openmind.db) / PostgreSQL 16 / Google Gemini API          │
│   Actual data storage and external AI provider                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why Layers?

Imagine you want to change your database from SQLite to PostgreSQL. With layers:
- **Layer 5 changes**: You change the `DATABASE_URL` in `.env`
- **Layer 4 stays the same**: Repositories use SQLAlchemy, which abstracts the database
- **Layers 1-3 stay the same**: They don't even know a database exists

Or imagine you want to replace Gemini with OpenAI:
- **Layer 3 changes**: You modify `ChatService` to call OpenAI instead
- **Layers 1, 2, 4, 5 stay the same**: The API endpoints and database don't change

**This is the power of separation of concerns.**

---

## Design Patterns Used

### 1. Application Factory Pattern
**Where**: `app/main.py`
**What**: Instead of creating the FastAPI app at module level, there's a function `create_application()` that builds and returns it.
**Why**: 
- Tests can create fresh app instances
- ASGI servers can import and call it directly
- All wiring (middleware, routes, error handlers) is explicit in one place

```python
# app/main.py
def create_application() -> FastAPI:
    app = FastAPI(...)
    app.add_middleware(CORSMiddleware, ...)
    app.include_router(api_router)
    add_exception_handlers(app)
    return app

app = create_application()  # Module-level instance for uvicorn
```

### 2. Repository Pattern
**Where**: `app/storage/`
**What**: Each database table has a dedicated Repository class that handles all CRUD operations.
**Why**: 
- Business logic never writes raw SQL
- Easy to mock for testing
- Single point of change if query logic needs updating

```
BaseRepository[T]          ← Generic with get_by_id, get_all, create, update, delete
    ├── ModelRepository         ← Inherits all CRUD, adds nothing extra
    ├── SessionRepository       ← Adds get_with_messages() for eager loading
    ├── ApiKeyRepository        ← Adds get_by_prefix() for fast key lookup
    ├── WorkflowRepository      ← Adds get_with_steps() for eager loading
    └── ... (8 more repositories)
```

### 3. Service Layer Pattern
**Where**: `app/services/`
**What**: Business logic lives in Service classes that sit between routes and repositories.
**Why**:
- Routes stay thin (just HTTP handling)
- Business rules are testable independently
- Services can coordinate multiple repositories

```python
# Route (thin — just HTTP + delegation):
@router.post("")
async def generate_chat(request: ChatRequest, service: ChatService = Depends(get_chat_service)):
    return await service.generate_response(request)

# Service (thick — all the business logic):
class ChatService:
    async def generate_response(self, request: ChatRequest):
        # 1. Persist user message
        # 2. Call Gemini API
        # 3. Persist assistant response
        # 4. Build and return response
```

### 4. Dependency Injection Pattern
**Where**: Throughout the API layer
**What**: FastAPI's `Depends()` injects database sessions, services, and authentication tokens.
**Why**: 
- No global state
- Easy to override for testing
- Automatic resource cleanup

```python
# The dependency chain:
get_db()                    → Yields AsyncSession (auto-commits or rolls back)
    ↓
get_chat_service(session)   → Creates ChatService with that session
    ↓
generate_chat(service)      → Route handler receives fully constructed service
```

### 5. DTO (Data Transfer Object) Pattern
**Where**: `app/schemas/`
**What**: Separate Pydantic models for API input/output, different from database models.
**Why**:
- Database columns shouldn't be directly exposed (security, flexibility)
- Request validation happens automatically via Pydantic
- Response format can change without touching the database

```
API Client sends:  ChatRequest (Pydantic schema)
                       ↓
Service processes: Uses ChatMessage, calls Gemini
                       ↓
Database stores:   MessageRecord (SQLAlchemy model)
                       ↓
API returns:       ChatResponse (Pydantic schema)
```

### 6. SSE Streaming Pattern
**Where**: `app/services/chat_service.py`
**What**: Uses Python async generators to stream chat responses token-by-token.
**Why**:
- Users see AI responses as they're generated (better UX)
- Follows OpenAI's streaming protocol
- Uses `StreamingResponse` with `media_type="text/event-stream"`

```python
async def stream_response(self, request) -> AsyncGenerator[str, None]:
    for chunk in gemini_response:
        yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
    yield "data: [DONE]\n\n"
```

### 7. Singleton Configuration Pattern
**Where**: `app/core/config.py`
**What**: `@lru_cache` ensures the Settings object is created once and reused.
**Why**:
- `.env` file is read only once
- All parts of the app share the same configuration instance
- Thread-safe by default

```python
@lru_cache
def get_settings() -> Settings:
    return Settings()  # Created once, cached forever
```

### 8. Lifespan Context Manager Pattern
**Where**: `app/core/lifespan.py`
**What**: Uses `@asynccontextmanager` to define startup and shutdown logic.
**Why**:
- Modern FastAPI approach (replaces deprecated `@app.on_event`)
- Clean resource acquisition and release
- Everything before `yield` is startup; everything after is shutdown

---

## Data Flow: How a Request Travels Through the System

Let's trace a real request — a user asking a chat question:

### Step 1: Browser → Vite Proxy
```
User clicks "Send" in Playground
    ↓
React calls streamChat({ messages, model, session_id })
    ↓
fetch("POST /chat/stream") is sent to localhost:3000
    ↓
Vite proxy forwards to localhost:8000/chat/stream
```

### Step 2: FastAPI Receives the Request
```
Uvicorn receives the HTTP request
    ↓
CORS middleware checks headers (allows everything with "*")
    ↓
FastAPI matches path /chat/stream to chat.py router
    ↓
Depends(get_db) creates an AsyncSession (database connection)
    ↓
Depends(get_chat_service) creates ChatService with that session
```

### Step 3: Service Processes the Request
```
ChatService.stream_response(request) is called
    ↓
If session_id exists, saves user message to database
    ↓
Checks if GEMINI_API_KEY is set
    ├── YES: Calls Gemini API with streaming
    └── NO:  Uses mock fallback text
    ↓
Yields SSE chunks: data: {"chunk": "Hello"}\n\n
    ↓
After all chunks, saves assistant message to database
    ↓
Yields final: data: [DONE]\n\n
```

### Step 4: Response Flows Back
```
StreamingResponse sends chunks to Vite proxy
    ↓
Vite proxy forwards to browser
    ↓
React streamChat() async generator yields each chunk
    ↓
Playground component appends text to UI in real-time
    ↓
get_db dependency auto-commits the database session
```

---

## Module Dependencies (Import Graph)

```
app/main.py
    ├── app/api/router.py
    │       ├── app/api/routes/chat.py
    │       │       ├── app/services/chat_service.py
    │       │       │       ├── app/schemas/chat.py
    │       │       │       ├── app/storage/session_repository.py
    │       │       │       │       └── app/models/session.py
    │       │       │       │               └── app/models/base.py
    │       │       │       └── app/core/config.py
    │       │       └── app/core/database.py
    │       ├── app/api/routes/models.py
    │       │       ├── app/services/model_service.py
    │       │       │       └── app/storage/model_repository.py
    │       │       │               └── app/models/model.py
    │       │       └── app/schemas/models.py
    │       ├── app/api/routes/sessions.py
    │       │       ├── app/services/session_service.py
    │       │       └── app/schemas/sessions.py
    │       ├── app/api/routes/gateway.py
    │       │       ├── app/services/api_key_service.py
    │       │       │       └── app/storage/api_key_repository.py
    │       │       └── app/storage/request_log_repository.py
    │       ├── app/api/routes/health.py
    │       │       └── app/schemas/health.py
    │       ├── app/api/routes/knowledge.py
    │       │       └── app/services/domain_services.py (KnowledgeService)
    │       ├── app/api/routes/workflows.py
    │       │       └── app/services/domain_services.py (WorkflowService)
    │       ├── app/api/routes/memory.py
    │       │       └── app/services/domain_services.py (MemoryService)
    │       ├── app/api/routes/logs.py
    │       │       └── app/services/domain_services.py (LogService)
    │       ├── app/api/routes/settings.py
    │       │       └── app/services/domain_services.py (SettingsService)
    │       ├── app/api/routes/benchmarks.py
    │       │       └── app/services/domain_services.py (BenchmarkService)
    │       ├── app/api/routes/api_keys.py
    │       │       └── app/services/api_key_service.py
    │       └── app/api/routes/monitoring.py
    │               └── app/services/monitoring_service.py
    ├── app/api/errors.py
    │       └── app/schemas/errors.py
    ├── app/core/config.py
    └── app/core/lifespan.py
            ├── app/core/logging.py
            ├── app/core/database.py
            └── app/models/__init__.py (imports all models)
```

---

## Frontend Architecture

```
client/index.html
    └── client/src/main.tsx (React root)
            └── App.tsx (Main state controller)
                    ├── Dashboard.tsx      (overview metrics)
                    ├── Playground.tsx     (chat interface)
                    ├── ApiExplorer.tsx    (API testing tool)
                    ├── Models.tsx         (model registry)
                    ├── Sessions.tsx       (session manager)
                    ├── Memory.tsx         (memory graph)
                    ├── Knowledge.tsx      (document manager)
                    ├── Orchestrator.tsx   (workflow builder)
                    ├── Benchmarks.tsx     (performance data)
                    ├── Logs.tsx           (system logs)
                    └── Settings.tsx       (configuration)
```

### Frontend Data Flow
```
App.tsx manages ALL state (useState hooks)
    ↓
On mount, calls API via client.ts to load data
    ↓
State is passed down as props to child components
    ↓
Child components call client.ts API methods
    ↓
Results update App.tsx state → React re-renders
```

> **Important architectural note**: The frontend is a **Single Page Application (SPA)** with no client-side routing library. Navigation between views is handled by a `currentView` state variable in `App.tsx`. There is no React Router.

---

## Database Architecture

The application uses 11 database tables organized into domain groups:

```
┌─────────────────────────────────────────────────────────┐
│                    AI MODELS GROUP                        │
│  models ─── benchmarks                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    CHAT GROUP                             │
│  sessions ─┬── messages (FK: session_id → sessions.id)  │
│            └── CASCADE DELETE                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    MEMORY GROUP                           │
│  memory_nodes ─┬── memory_connections (2 FKs)           │
│                └── memory_logs (no FK, independent)     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    WORKFLOW GROUP                         │
│  workflows ─── workflow_steps (FK: workflow_id)         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    SYSTEM GROUP                           │
│  api_keys    knowledge_sources    log_entries            │
│  request_logs    system_settings                         │
└─────────────────────────────────────────────────────────┘
```

Every table inherits:
- `id` (UUID string, primary key) from `UUIDMixin`
- `created_at` (timestamp) from `TimestampMixin`
- `updated_at` (timestamp, auto-updates) from `TimestampMixin`
