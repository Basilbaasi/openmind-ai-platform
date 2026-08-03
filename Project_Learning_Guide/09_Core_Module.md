# 09 — Core Module Deep Dive

Every file in `app/core/` explained line-by-line.

The `core/` directory contains the infrastructure that the rest of the application depends on. Nothing in `core/` contains business logic — it's all about **configuration, database connections, startup/shutdown, and logging**.

---

## File: `app/core/__init__.py`

```python
"""Core application infrastructure."""
```

**Purpose**: Marks `core/` as a Python package. Contains only a docstring. No imports, no exports.

---

## File: `app/core/config.py`

**Purpose**: Loads configuration from environment variables (`.env` file) into a type-safe Python object.

**Why it matters**: Every other module reads settings from here — database URL, API keys, server port, etc.

### Line-by-line walkthrough:

```python
"""
Application configuration.

Uses pydantic-settings to read values from environment variables
and/or a .env file. The get_settings() function returns a cached
singleton so the .env file is only parsed once.
"""
```
Lines 1-6: Docstring explaining what this module does and its caching strategy.

```python
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings
```
Lines 8-11: **Imports**
- `lru_cache`: Python decorator that caches function return values. Call the function once, get the cached result on subsequent calls.
- `Literal`: Type hint that restricts a value to specific strings (e.g., `"development" | "staging" | "production"`).
- `BaseSettings`: From `pydantic-settings` library. Like Pydantic's `BaseModel`, but automatically reads values from environment variables.

```python
class Settings(BaseSettings):
```
Line 14: The main configuration class. Inherits from `BaseSettings`, which means:
- Each field becomes an environment variable
- Field `APP_NAME` → reads from env var `APP_NAME`
- Default values are used when env var is not set

```python
    # ── Application ──────────────────────────────────────────────
    APP_NAME: str = "OpenMind AI Platform"
    APP_VERSION: str = "0.2.0"
    APP_DESCRIPTION: str = (
        "Enterprise-grade AI platform with model routing, agent workflows, "
        "graph memory, and document ingestion."
    )
```
Lines 16-21: **Application metadata fields**
- `APP_NAME`: Displayed in API docs, health checks, frontend. Default: `"OpenMind AI Platform"`.
- `APP_VERSION`: Semantic version string. Returned by `/health` and `/` endpoints.
- `APP_DESCRIPTION`: Long description used in the OpenAPI (Swagger) docs page.

```python
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
```
Line 23: **Environment field**
- `Literal[...]` means the value MUST be one of these three strings. Any other value causes a `ValidationError` at startup.
- Default: `"development"`.
- This is checked in tests (`test_config.py` line 77).

```python
    DEBUG: bool = False
```
Line 24: **Debug flag**
- When `True`: SQLAlchemy logs every SQL query to stdout (`echo=True`).
- Default: `False`.

> **⚠️ DEVELOPER_GUIDE.md Discrepancy**: The guide says `DEBUG: bool = True`. The actual code defaults to `False`.

```python
    # ── Server ───────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1
```
Lines 27-29: **Server configuration**
- `HOST`: IP address to bind to. `0.0.0.0` means "accept connections from any interface."
- `PORT`: HTTP port number. Default: 8000.
- `WORKERS`: Number of Uvicorn worker processes. Default: 1 (fine for development).

```python
    # ── API ──────────────────────────────────────────────────────
    API_V1_PREFIX: str = "/api/v1"
```
Line 32: **API versioning prefix**
- The OpenAI-compatible gateway routes are mounted under this prefix.
- So the full URL for chat completions is: `/api/v1/chat/completions`

```python
    # ── Database ─────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./openmind.db"
```
Line 35: **Database connection string**
- Default: SQLite with `aiosqlite` async driver, stored in file `openmind.db` in the project root.
- For production: Override with `postgresql+asyncpg://user:pass@host:5432/dbname`
- This URL is passed directly to SQLAlchemy's `create_async_engine()`.

```python
    # ── AI / LLM ─────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
```
Line 38: **Gemini API key**
- If empty string: `ChatService` falls back to a mock response.
- If set: `ChatService` calls the real Google Gemini API.
- Read from `.env` file's `GEMINI_API_KEY=your-key-here`.

```python
    # ── Security ─────────────────────────────────────────────────
    API_KEY_HEADER: str = "Authorization"
```
Line 41: **API key header name**
- The gateway routes expect the API key in this HTTP header.
- Default: `"Authorization"` (used as `Authorization: Bearer om_xxx`).

```python
    # ── File Storage ─────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 50
```
Lines 44-45: **File upload settings**
- `UPLOAD_DIR`: Directory where uploaded knowledge documents (PDFs) are saved.
- `MAX_UPLOAD_SIZE_MB`: Maximum allowed upload size. Currently NOT enforced in code (the setting exists but there's no size check middleware).

```python
    # ── Logging ──────────────────────────────────────────────────
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    LOG_FORMAT: Literal["json", "text"] = "text"
```
Lines 48-49: **Logging configuration**
- `LOG_LEVEL`: Python logging level. `Literal` constrains it to valid values.
- `LOG_FORMAT`: `"json"` for structured JSON logs (production), `"text"` for human-readable (development).

```python
    # ── CORS ─────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["*"]
```
Line 52: **CORS origins**
- `["*"]` means "allow requests from any origin."
- In production, you'd set this to `["https://yourdomain.com"]`.
- This is passed to `CORSMiddleware` in `main.py`.

```python
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }
```
Lines 54-58: **Pydantic Settings configuration**
- `env_file`: Read environment variables from `.env` file in the project root.
- `env_file_encoding`: File encoding for `.env` file.
- `extra = "ignore"`: If `.env` has variables not defined in `Settings`, ignore them (don't crash).

```python
@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (singleton)."""
    return Settings()
```
Lines 61-64: **Singleton factory function**
- `@lru_cache`: Caches the return value. First call creates a `Settings()` object (reads `.env`). All subsequent calls return the cached object.
- This is used everywhere: `settings = get_settings()`.
- **Important**: Because of `lru_cache`, changing `.env` requires restarting the server.

### Import graph:
```
config.py imports:
    ← functools.lru_cache (standard library)
    ← typing.Literal (standard library)
    ← pydantic_settings.BaseSettings (third-party)

config.py is imported by:
    → database.py (reads DATABASE_URL, DEBUG)
    → seed.py (reads settings for seeding)
    → chat_service.py (reads GEMINI_API_KEY)
    → monitoring_service.py (reads DATABASE_URL)
    → api_key_service.py (reads settings)
    → health.py routes (reads APP_VERSION, ENVIRONMENT)
    → main.py (reads APP_NAME, APP_VERSION, APP_DESCRIPTION, CORS_ORIGINS)
    → lifespan.py (reads LOG_LEVEL, LOG_FORMAT)
    → Every test that checks configuration
```

---

## File: `app/core/database.py`

**Purpose**: Creates the database engine, session factory, and the `get_db()` dependency that every route handler uses.

### Line-by-line walkthrough:

```python
"""
Database engine and session management.

Configures the async SQLAlchemy engine based on the DATABASE_URL
setting. Provides the ``get_db`` dependency that yields an async
session per request with automatic commit/rollback.
"""
```
Lines 1-6: Docstring.

```python
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
```
Lines 8-12: **Imports**
- `AsyncGenerator`: Type hint for async generator functions (functions that `yield` asynchronously).
- `AsyncSession`: SQLAlchemy's async database session (like a "connection with a transaction").
- `async_sessionmaker`: Factory that creates `AsyncSession` instances with preset configuration.
- `create_async_engine`: Creates the database "engine" (connection pool manager).
- `get_settings`: To read `DATABASE_URL` and `DEBUG`.

```python
settings = get_settings()
```
Line 14: **Module-level settings access**.
- This runs when the module is first imported.
- Returns the cached Settings singleton.

```python
engine_kwargs: dict = {"echo": settings.DEBUG}
```
Line 16: **Engine configuration starts**.
- `echo=True` makes SQLAlchemy print every SQL query to stdout. Only enabled in debug mode.

```python
if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update(
        {
            "pool_size": 10,
            "max_overflow": 20,
            "pool_pre_ping": True,
            "pool_recycle": 3600,
        }
    )
```
Lines 18-28: **Database-specific configuration**.

This is **critical** and a common source of bugs. SQLite and PostgreSQL need different configurations:

| Parameter | SQLite | PostgreSQL |
|-----------|--------|------------|
| `check_same_thread` | `False` (required — async uses multiple threads) | N/A |
| `pool_size` | ❌ (SQLite doesn't support connection pooling) | `10` (max persistent connections) |
| `max_overflow` | ❌ | `20` (extra connections beyond pool_size) |
| `pool_pre_ping` | ❌ | `True` (tests connection before using it) |
| `pool_recycle` | ❌ | `3600` (recreate connections after 1 hour) |

**If you pass `pool_size` to SQLite, the server crashes on startup.** This `if/else` prevents that.

```python
engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)
```
Line 30: **Creates the database engine**.
- The engine manages a pool of database connections.
- It does NOT create a connection immediately — connections are created lazily on first use.

```python
async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)
```
Lines 32-34: **Creates the session factory**.
- `async_sessionmaker`: A factory that produces `AsyncSession` objects with preset configuration.
- `class_=AsyncSession`: The type of session to create.
- `expire_on_commit=False`: **Important!** After a commit, ORM objects normally "expire" (their attributes become lazy-loaded). Setting this to `False` means you can still access attributes after commit without triggering extra queries. This is essential for returning data after committing.

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async session with automatic commit/rollback."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```
Lines 37-44: **The most important function in the backend.**

This is a **FastAPI dependency** used as an async generator:

1. `async with async_session_factory() as session`: Creates a new session and ensures it's closed when done.
2. `yield session`: Hands the session to the route handler. Execution pauses here.
3. If the handler succeeds: `await session.commit()` → all database changes are saved.
4. If the handler raises an exception: `await session.rollback()` → all changes are undone.
5. `raise`: Re-raises the exception so FastAPI can return an error response.

### Import graph:
```
database.py imports:
    ← collections.abc.AsyncGenerator
    ← sqlalchemy.ext.asyncio (AsyncSession, async_sessionmaker, create_async_engine)
    ← app.core.config.get_settings

database.py is imported by:
    → Every route handler (via Depends(get_db))
    → app/core/seed.py (uses engine and async_session_factory directly)
    → app/core/lifespan.py (uses engine for table creation)
```

---

## File: `app/core/lifespan.py`

**Purpose**: Defines what happens when the server starts up and shuts down.

### Line-by-line walkthrough:

```python
"""
Application lifespan manager.

Handles startup tasks (logging, database initialisation, optional seeding)
and shutdown cleanup using FastAPI's async lifespan protocol.
"""
```

```python
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from app.core.config import get_settings
from app.core.database import engine
from app.core.logging import setup_logging
from app.models import Base
```
Lines 8-15: **Imports**
- `asynccontextmanager`: Decorator that turns an async generator into a context manager.
- `structlog`: Structured logging library.
- `engine`: The SQLAlchemy engine from `database.py`.
- `setup_logging`: Configures structlog.
- `Base`: The SQLAlchemy declarative base class (used to create tables).

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
```
Lines 18-19: **The lifespan function**.
- `@asynccontextmanager`: Makes this work as `async with lifespan(app):`.
- FastAPI calls this once on startup, and the code after `yield` runs on shutdown.
- `app: FastAPI`: The application instance (passed by FastAPI automatically).

```python
    settings = get_settings()
    setup_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
    logger = structlog.get_logger()
```
Lines 20-22: **Phase 1: Configure logging**
- Sets up structlog with the configured level and format.
- Gets a logger instance for this module.

```python
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```
Lines 25-26: **Phase 2: Create database tables**
- `engine.begin()`: Starts a transaction.
- `conn.run_sync(Base.metadata.create_all)`: Runs the synchronous `create_all()` method, which creates all tables defined by SQLAlchemy models that don't already exist.
- **Important**: `run_sync()` is needed because `create_all()` is synchronous, but our engine is async. This adapter runs it in a thread pool.

```python
    logger.info(
        "application_started",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )
```
Lines 28-33: **Phase 3: Log startup**
- Structured log entry with key-value pairs (not just a string message).

```python
    yield  # ← Application runs here
```
Line 35: **The application runs between startup and shutdown.**
- Everything before `yield` = startup.
- The `yield` point = application is running and serving requests.
- Everything after `yield` = shutdown.

```python
    logger.info("application_shutdown")
```
Line 37: **Phase 4: Log shutdown**
- Runs when the server is stopping (Ctrl+C or `docker stop`).

---

## File: `app/core/logging.py`

**Purpose**: Configures the `structlog` logging library.

### Line-by-line walkthrough:

```python
"""
Structured logging configuration.

Initialises structlog with either JSON or human-readable text output
depending on the LOG_FORMAT setting.
"""

import logging
import structlog
```
Lines 1-9: **Imports**
- `logging`: Python's standard logging library. `structlog` wraps around it.
- `structlog`: Third-party structured logging library that produces log entries as key-value pairs.

```python
def setup_logging(log_level: str = "INFO", log_format: str = "text") -> None:
```
Line 12: **Main setup function**
- `log_level`: e.g., `"DEBUG"`, `"INFO"`, `"WARNING"`
- `log_format`: `"json"` or `"text"`

```python
    level = getattr(logging, log_level.upper(), logging.INFO)
```
Line 14: **Convert string to logging constant**
- `"INFO"` → `logging.INFO` (which is the integer `20`).
- `getattr(logging, "INFO")` is equivalent to `logging.INFO`.
- Falls back to `logging.INFO` if the string is invalid.

```python
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]
```
Lines 16-21: **Shared log processors**
- `merge_contextvars`: Merges context variables into each log entry (useful for request-scoped data).
- `add_log_level`: Adds the `level` field (`info`, `warning`, `error`).
- `TimeStamper(fmt="iso")`: Adds ISO 8601 timestamp to every log entry.
- `StackInfoRenderer()`: Includes stack trace when `stack_info=True` is passed.

```python
    if log_format == "json":
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer()
```
Lines 23-26: **Choose output format**
- `JSONRenderer()`: Produces `{"event": "application_started", "level": "info", ...}` (for production log aggregators).
- `ConsoleRenderer()`: Produces colored, human-readable output (for development terminals).

The rest of the function configures structlog and Python's standard logging module with these processors.

---

## File: `app/core/seed.py`

**Purpose**: Populates the database with initial/demo data. Run with `python -m app.core.seed`.

### Key mechanism: `session.merge()`

The seed script uses `merge()` instead of `add()`:

```python
# add() → crashes if record with same ID already exists
session.add(ModelRecord(id="llama3-8b", ...))  # ❌ IntegrityError on re-run

# merge() → inserts if new, updates if exists
await session.merge(ModelRecord(id="llama3-8b", ...))  # ✅ Safe to re-run
```

This makes the seed script **idempotent** — you can run it 100 times and get the same result.

### What it seeds:

1. **`seed_models()`**: 7 AI models (Llama 3, Mistral, DeepSeek, Gemini 2.0/3.5, GPT-4o, CLIP)
2. **`seed_sessions()`**: 2 demo chat sessions with messages
3. **`seed_knowledge()`**: 3 demo knowledge sources (PDFs, markdown files)
4. **`seed_workflows()`**: 2 demo workflows with steps
5. **`seed_memory()`**: 8 memory nodes and 5 connections
6. **`seed_memory_logs()`**: 5 memory operation logs
7. **`seed_benchmarks()`**: Performance benchmark data for each model
8. **`seed_log_entries()`**: 5 demo system log entries
9. **`seed_settings()`**: Default system settings (platform name, theme, etc.)

### The `run_seed()` function:

```python
async def run_seed() -> None:
    # Step 1: Create all tables (if they don't exist)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Step 2: Open a session and seed everything
    async with async_session_factory() as session:
        await seed_models(session)
        await seed_sessions(session)
        # ... all other seed functions ...
        await session.commit()  # Step 3: Save everything
```

### Entry point:

```python
if __name__ == "__main__":
    asyncio.run(run_seed())
```
This allows running: `python -m app.core.seed` from the command line.

### Import graph:
```
seed.py imports:
    ← asyncio
    ← json
    ← sqlalchemy.ext.asyncio.AsyncSession
    ← app.core.database (engine, async_session_factory)
    ← app.models.* (every model class for seeding)

seed.py is imported by:
    → Nothing (it's a standalone script, run manually)
```

---

## How the Core Module Fits Together

```
                 ┌─────────────────┐
                 │   main.py       │
                 │ create_app()    │
                 └───────┬─────────┘
                         │ passes lifespan function
                         ▼
                 ┌─────────────────┐
                 │  lifespan.py    │
                 │ startup/stop   │
                 └───┬───────┬─────┘
                     │       │
          calls      │       │ calls
                     ▼       ▼
          ┌──────────┐  ┌──────────────┐
          │logging.py│  │ database.py  │
          │setup_log │  │ create_all   │
          └──────────┘  └──────┬───────┘
                               │ reads
                               ▼
                        ┌──────────────┐
                        │  config.py   │
                        │ get_settings │
                        └──────────────┘
                               │ reads
                               ▼
                          ┌─────────┐
                          │  .env   │
                          └─────────┘
```

### Initialization order:
1. `config.py` is imported → `get_settings()` is available (but NOT called yet)
2. `database.py` is imported → calls `get_settings()` at module level → reads `.env` → creates engine
3. `main.py` calls `create_application()` → passes `lifespan` to FastAPI
4. When `uvicorn` starts → FastAPI calls `lifespan()` as context manager:
   - `setup_logging()` configures structlog
   - `Base.metadata.create_all()` creates database tables
   - `logger.info("application_started")` logs startup
5. Application serves requests using `get_db()` from `database.py`
6. On shutdown → `logger.info("application_shutdown")`
