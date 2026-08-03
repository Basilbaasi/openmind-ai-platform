# 08 — Folder Structure

Every folder's purpose and what happens if you delete it.

---

## Root Directory Map

```
openmind-ai-platform/
├── app/                    ← The entire backend
├── client/                 ← The entire frontend
├── tests/                  ← Backend test suite
├── scripts/                ← Shell scripts for dev convenience
├── .github/                ← CI/CD configuration
├── Project_Learning_Guide/ ← This documentation (you're reading it)
├── docs/                   ← Additional documentation assets
├── assets/                 ← Static assets (images, etc.)
├── Dockerfile              ← Production Docker image
├── docker-compose.yml      ← Multi-container orchestration
├── requirements.txt        ← Python dependencies
├── pyproject.toml          ← Python tool configuration
├── .env.example            ← Environment variable template
├── .env                    ← Your environment variables (gitignored)
├── .gitignore              ← Git exclusion rules
├── .dockerignore           ← Docker build exclusion rules
├── README.md               ← Public project README
├── CHANGELOG.md            ← Version history
└── DEVELOPER_GUIDE.md      ← Reference guide (gitignored)
```

---

## Folder-by-Folder Breakdown

### `app/` — Backend Application

| If you delete... | What breaks |
|-------------------|-------------|
| Entire `app/` | Everything — the server can't start |
| `app/__init__.py` | Python can't import `app` as a package |

---

### `app/core/` — Infrastructure

| File | If deleted... |
|------|---------------|
| `config.py` | FATAL: Every module that reads settings crashes with ImportError |
| `database.py` | FATAL: No database connections, every route handler fails |
| `lifespan.py` | FATAL: App won't start (lifespan referenced in main.py) |
| `logging.py` | WARNING: Startup logs won't appear, but app still works |
| `seed.py` | OK: Only affects `python -m app.core.seed` command |

---

### `app/models/` — Database Tables

| File | If deleted... |
|------|---------------|
| `__init__.py` | CRITICAL: `create_all()` won't find any models → no tables created |
| `base.py` | FATAL: Every model inherits from Base — all models break |
| `model.py` | `models` table not created, `/models` endpoints fail |
| `session.py` | `sessions` + `messages` tables not created, chat persistence fails |
| `api_key.py` | `api_keys` table not created, gateway auth fails |
| Any other model file | Its corresponding table won't be created; related endpoints fail |

---

### `app/schemas/` — Pydantic Validation

| File | If deleted... |
|------|---------------|
| `chat.py` | Chat endpoints can't validate requests or build responses |
| `errors.py` | Error handler can't build standardized error responses |
| `health.py` | Health and root endpoints can't build responses |
| `models.py` | Model endpoints can't validate requests |
| `sessions.py` | Session endpoints can't validate requests |

---

### `app/services/` — Business Logic

| File | If deleted... |
|------|---------------|
| `chat_service.py` | Chat endpoints fail (no AI integration) |
| `session_service.py` | Session CRUD endpoints fail |
| `model_service.py` | Model CRUD endpoints fail |
| `api_key_service.py` | API key management + gateway auth fails |
| `monitoring_service.py` | `/api/status` endpoint fails |
| `domain_services.py` | Knowledge, workflow, memory, log, settings, benchmark endpoints all fail |

---

### `app/storage/` — Repositories

| File | If deleted... |
|------|---------------|
| `base_repository.py` | FATAL: Every repository inherits from this |
| Any other repository | The service that uses it fails |

---

### `app/api/` — Routes

| File | If deleted... |
|------|---------------|
| `router.py` | FATAL: No routes registered → app returns 404 for everything |
| `errors.py` | Errors return FastAPI's default format instead of standardized APIError |
| `routes/health.py` | `/` and `/health` endpoints gone |
| `routes/chat.py` | `/chat` and `/chat/stream` gone |
| Any other route file | Its endpoints disappear from the API |

---

### `client/` — Frontend Application

| File/Folder | If deleted... |
|-------------|---------------|
| Entire `client/` | No frontend — backend API still works via Swagger |
| `index.html` | Vite can't serve the page |
| `src/main.tsx` | React can't mount |
| `src/App.tsx` | No UI renders |
| `src/api/client.ts` | Frontend can't talk to the backend |
| `src/types.ts` | TypeScript compilation fails |
| `src/data.ts` | No fallback data when backend is offline |
| `src/components/` | Individual views disappear |
| `package.json` | `npm install` and `npm run dev` fail |
| `vite.config.ts` | Vite can't start, proxy doesn't work |

---

### `tests/` — Test Suite

| File | If deleted... |
|------|---------------|
| `conftest.py` | All tests that use `async_client` or `app` fixtures fail |
| Any test file | Those specific tests don't run (but everything else works) |
| Entire `tests/` | Can't run tests, but application still works |

---

### Infrastructure Files

| File | If deleted... |
|------|---------------|
| `Dockerfile` | Can't build Docker image |
| `docker-compose.yml` | Can't run `docker compose up` |
| `.github/workflows/ci.yml` | CI/CD pipeline stops running |
| `requirements.txt` | Can't install Python dependencies |
| `pyproject.toml` | Pytest/Ruff/Mypy lose their configuration |
| `.env.example` | New developers don't know what env vars to set |
| `.env` | App uses all default values (which work for SQLite dev) |
| `.gitignore` | Sensitive files could be committed to Git |
| `.dockerignore` | Docker builds become slower (includes unnecessary files) |
| `scripts/start.sh` | Can't use the convenience start script |
| `scripts/run_tests.sh` | Can't use the convenience test script |

---

## Dependency Flow Between Folders

```
app/api/routes/  ──imports──▶  app/services/     ──imports──▶  app/storage/
       │                            │                              │
       │                            │                              │
  imports                      imports                        imports
       │                            │                              │
       ▼                            ▼                              ▼
 app/schemas/              app/core/config.py              app/models/
                           app/core/database.py            app/models/base.py
```

**Rule**: Dependencies flow downward only. Routes depend on services, services depend on repositories, repositories depend on models. Nothing flows upward — models don't know about repositories, repositories don't know about services.
