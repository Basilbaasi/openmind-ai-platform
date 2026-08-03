# 23 — Learning Roadmap

A structured week-by-week learning plan to go from "I understand Python basics" to "I can explain every file in this codebase to another engineer."

---

## Prerequisites (Before You Start)

Make sure you understand these concepts at a basic level:

- [ ] Python: classes, inheritance, decorators, `async`/`await`, `with` statements
- [ ] FastAPI: route decorators, `Depends()`, Pydantic models
- [ ] SQL: SELECT, INSERT, UPDATE, DELETE, JOINs, foreign keys
- [ ] HTTP: GET, POST, PUT, DELETE, status codes, headers, JSON
- [ ] Terminal: running Python scripts, installing packages

If any of these feel shaky, spend 1-2 days on them before starting.

---

## Week 1: Foundation & Infrastructure

**Goal**: Understand how the app boots and serves requests.

### Day 1: Configuration System
- [ ] Read: `01_Project_Overview.md` — understand what the project is
- [ ] Read: `09_Core_Module.md` → `config.py` section
- [ ] Exercise: Open `.env.example` and identify every setting in `config.py`
- [ ] Exercise: Change `PORT` in `.env` and verify the server starts on the new port

### Day 2: Database Setup
- [ ] Read: `09_Core_Module.md` → `database.py` section
- [ ] Exercise: Set `DEBUG=true` in `.env`, start the server, and read the SQL queries printed to console
- [ ] Exercise: Open `openmind.db` with a SQLite viewer (like DB Browser) and explore the tables
- [ ] Key concept: Understand why `flush()` ≠ `commit()` and why it matters

### Day 3: Application Lifecycle
- [ ] Read: `09_Core_Module.md` → `lifespan.py` and `logging.py` sections
- [ ] Read: `05_Runtime_Lifecycle.md`
- [ ] Exercise: Add `logger.info("custom_message")` at the start of `lifespan()` and verify it appears when starting the server
- [ ] Key concept: Understand what `yield` does in a context manager

### Day 4: Application Factory & Main Entry Point
- [ ] Read: `app/main.py` and understand `create_application()`
- [ ] Exercise: List the 3 things `create_application()` does (middleware, router, error handlers)
- [ ] Exercise: Run `python -m app.core.seed` and verify data appears in the database

### Day 5: Review & Quiz
- [ ] Draw the startup sequence from memory (config → database → lifespan → tables → serve)
- [ ] Answer: What happens if `DATABASE_URL` is wrong? At what point does it fail?
- [ ] Answer: Why is `get_settings()` decorated with `@lru_cache`?

---

## Week 2: Data Layer (Models, Schemas, Repositories)

**Goal**: Understand how data is stored, validated, and accessed.

### Day 1: SQLAlchemy Models
- [ ] Read: `13_Models_Module.md`
- [ ] Exercise: Identify every table, its columns, and its foreign keys
- [ ] Exercise: Draw the relationships between `sessions ↔ messages` and `workflows ↔ workflow_steps`
- [ ] Key concept: Understand `UUIDMixin` and `TimestampMixin`

### Day 2: Pydantic Schemas
- [ ] Read: `12_Schemas_Module.md`
- [ ] Exercise: Compare `SessionRecord` (ORM) with `SessionCreateRequest` (Pydantic) — what's different?
- [ ] Exercise: Compare `ModelRecord` (ORM) with `ModelMetadata` (Pydantic) — what fields are added/removed?
- [ ] Key concept: Why are these two types of "models" separate?

### Day 3: Base Repository
- [ ] Read: `14_Repositories_Module.md` → `base_repository.py` section
- [ ] Exercise: Trace what happens when `BaseRepository.create(name="GPT-4")` is called — list every step
- [ ] Key concept: Understand `Generic[T]` and `TypeVar`

### Day 4: Domain Repositories
- [ ] Read: `14_Repositories_Module.md` → all other repositories
- [ ] Exercise: Count how many repositories add custom methods vs just inherit from Base
- [ ] Exercise: Explain what `selectinload` does and why it's needed for async

### Day 5: Review & Quiz
- [ ] Answer: What's the difference between `session.get()` and `select(Model).where(...)`?
- [ ] Answer: Why does `upsert()` in `SettingsRepository` check for existing records first?
- [ ] Answer: If you delete a session, what happens to its messages? Trace the cascade.

---

## Week 3: Business Logic (Services)

**Goal**: Understand where all the "real work" happens.

### Day 1: ChatService (Sync)
- [ ] Read: `11_Services_Module.md` → `chat_service.py` section
- [ ] Exercise: Trace `generate_response()` step-by-step for a request WITH and WITHOUT a session_id
- [ ] Exercise: Identify what happens when `GEMINI_API_KEY` is empty

### Day 2: ChatService (Streaming)
- [ ] Read: `11_Services_Module.md` → `stream_response()` section
- [ ] Exercise: Write pseudo-code for the SSE protocol
- [ ] Key concept: Understand `async def` with `yield` (async generator)

### Day 3: Session, Model, and API Key Services
- [ ] Read: `11_Services_Module.md` → remaining services
- [ ] Exercise: Trace `ApiKeyService.generate_key()` — how is the key stored vs returned?
- [ ] Exercise: Trace `ApiKeyService.validate_key()` — why is prefix lookup O(1)?

### Day 4: Domain Services
- [ ] Read: `11_Services_Module.md` → `domain_services.py`
- [ ] Exercise: Trace `KnowledgeService.upload_file()` — what happens to a PDF?
- [ ] Exercise: Is `WorkflowService.execute_workflow()` actually executing anything real?

### Day 5: Review & Quiz
- [ ] Answer: Why does `ChatService.__init__` create a `MessageRepository` but NOT a `SessionRepository`?
- [ ] Answer: In the model service, why are `version` and `capabilities` hardcoded?
- [ ] Draw: The service-to-repository dependency map from memory

---

## Week 4: API Layer (Routes)

**Goal**: Understand every endpoint and how they connect services to HTTP.

### Day 1: Router & Error Handling
- [ ] Read: `10_API_Module.md` (or the route files directly)
- [ ] Exercise: List all 13 route modules and their URL prefixes
- [ ] Exercise: Trace what happens when you send invalid JSON to `POST /chat`

### Day 2: Health, Chat, and Gateway Routes
- [ ] Read: `03_Backend_Flow.md` — all traces
- [ ] Exercise: Compare `POST /chat` and `POST /api/v1/chat/completions` — same logic, different wrapper
- [ ] Exercise: What extra steps does the gateway add? (auth, logging, format conversion)

### Day 3: CRUD Routes (Models, Sessions, Knowledge, Workflows)
- [ ] Exercise: Read `app/api/routes/sessions.py` — identify the DI pattern in every handler
- [ ] Exercise: Which routes return 201 vs 200? Which return 204?
- [ ] Key pattern: Every route follows: parse → inject session → create service → call method → return

### Day 4: Remaining Routes (Memory, Logs, Settings, Benchmarks, API Keys, Monitoring)
- [ ] Exercise: Read all remaining route files
- [ ] Exercise: Which routes create services inside the handler vs receive them via `Depends()`?

### Day 5: Review & Full API Trace
- [ ] Exercise: Trace a complete request from browser click → Vite proxy → FastAPI → service → repository → database → response → UI update
- [ ] Draw: The full request pipeline from memory

---

## Week 5: Frontend

**Goal**: Understand how the React UI works and communicates with the backend.

### Day 1: Entry Point & Build System
- [ ] Read: `client/index.html`, `main.tsx`, `vite.config.ts`
- [ ] Exercise: Identify every proxy rule in `vite.config.ts`
- [ ] Key concept: Understand how Vite proxy eliminates CORS issues

### Day 2: App.tsx State Management
- [ ] Read: `15_Frontend_Components.md` (if available) or `App.tsx` directly
- [ ] Exercise: List every `useState` hook in `App.tsx` and what state it manages
- [ ] Exercise: Trace the `useEffect` that loads data from the backend on mount

### Day 3: API Client
- [ ] Read: `client/src/api/client.ts`
- [ ] Exercise: Trace `streamChat()` — how does the async generator parse SSE?
- [ ] Exercise: What happens when a request returns HTTP 204?

### Day 4: Component Survey
- [ ] Read: `client/src/types.ts` — understand every TypeScript interface
- [ ] Exercise: Match each frontend interface to its backend Pydantic schema
- [ ] Exercise: Read 2-3 components and identify how they call the API

### Day 5: Review
- [ ] Answer: Why does App.tsx manage ALL state instead of using a state library?
- [ ] Answer: How does the frontend handle backend unavailability (the `data.ts` fallback)?

---

## Week 6: Testing, Docker, CI/CD

**Goal**: Understand the testing strategy, deployment, and automation.

### Day 1: Test Infrastructure
- [ ] Read: `16_Tests.md`
- [ ] Read: `tests/conftest.py` — understand the `async_client` fixture
- [ ] Exercise: Run `pytest tests/ -v` and review the output

### Day 2: Test Walkthroughs
- [ ] Read: `test_health.py`, `test_config.py`, `test_application.py`
- [ ] Exercise: Identify what each test class verifies
- [ ] Exercise: Add a new test to `test_health.py` and verify it passes

### Day 3: Docker
- [ ] Read: `17_Docker.md`
- [ ] Read: `Dockerfile` line-by-line
- [ ] Exercise: Explain the two stages of the Dockerfile and why they exist

### Day 4: Docker Compose & CI/CD
- [ ] Read: `docker-compose.yml` — identify the 3 services and their dependencies
- [ ] Read: `.github/workflows/ci.yml` — understand the lint → test pipeline

### Day 5: Final Review
- [ ] Walk through the entire codebase directory by directory
- [ ] Explain each file's purpose to a rubber duck (or a friend)
- [ ] Identify 3 things you'd want to improve

---

## Post-Roadmap: Mastery Exercises

Once you've completed the 6-week roadmap:

1. **Add a new feature end-to-end**: Create a "Projects" entity following the pattern in `DEVELOPER_GUIDE.md` Section 12 — model, repository, service, schema, route, frontend component
2. **Integrate Alembic migrations**: The dependency is installed but not configured. Set it up.
3. **Add real GPU monitoring**: Use `pynvml` to report actual NVIDIA GPU metrics
4. **Add vector embeddings**: Use the installed `pgvector` library with Gemini embeddings
5. **Add authentication**: Implement JWT-based user authentication for the frontend

---

## How to Know You've "Made It"

You can confidently explain:

- [ ] What every file in the project does
- [ ] How a chat message goes from browser keystroke to Gemini API and back
- [ ] Why the project uses repositories instead of direct SQL
- [ ] What `Depends(get_db)` does behind the scenes
- [ ] How SSE streaming works on both the backend and frontend
- [ ] Why the seed script uses `merge()` instead of `add()`
- [ ] What happens when the database transaction fails mid-request
- [ ] How API keys are securely stored and validated
- [ ] The difference between `SessionRecord` and `SessionResponse`
- [ ] Why the frontend normalizes backend data in `useEffect`
