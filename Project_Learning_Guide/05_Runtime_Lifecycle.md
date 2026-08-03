# 05 — Runtime Lifecycle

What happens from the moment you type `uvicorn app.main:app --reload` to the moment the server shuts down.

---

## Phase 1: Python Module Loading

When Uvicorn starts, it imports `app.main` and accesses the `app` attribute.

```
uvicorn app.main:app --reload
    │
    ├── Python imports app/main.py
    │       ├── Imports app/core/config.py
    │       │       └── Defines Settings class (but does NOT read .env yet)
    │       │
    │       ├── Imports app/core/database.py
    │       │       ├── Calls get_settings() → NOW reads .env file → Creates Settings singleton
    │       │       ├── Detects database type (sqlite vs postgresql)
    │       │       ├── Creates SQLAlchemy engine (connection pool, but no connections yet)
    │       │       └── Creates async_session_factory (session template, no sessions yet)
    │       │
    │       ├── Imports app/api/router.py
    │       │       └── Imports ALL 13 route modules
    │       │               └── Each route module imports its service + schema modules
    │       │                       └── Each service imports its repository + model modules
    │       │
    │       ├── Imports app/api/errors.py
    │       │       └── Imports app/schemas/errors.py (ErrorDetail, APIError)
    │       │
    │       └── Calls create_application()
    │               ├── Creates FastAPI instance with title, version, description
    │               ├── Adds CORSMiddleware
    │               ├── Includes api_router (all 13 route modules)
    │               ├── Registers exception handlers (422, 4xx, 500)
    │               └── Returns the FastAPI app object
    │
    └── app = create_application()  ← Module-level variable for Uvicorn
```

**Key insight**: By the time `create_application()` finishes, no database connections exist, no tables have been created, and no data has been loaded. The app is just a Python object describing the routes and middleware.

---

## Phase 2: Startup (Lifespan Enter)

Uvicorn starts the ASGI event loop and triggers the lifespan context manager.

```
Uvicorn event loop starts
    │
    └── FastAPI calls lifespan(app) — enters the async context manager
            │
            ├── Step 1: Configure Logging
            │       setup_logging(log_level="INFO", log_format="text")
            │       └── Initializes structlog with console renderer
            │
            ├── Step 2: Create Database Tables
            │       async with engine.begin() as conn:
            │           await conn.run_sync(Base.metadata.create_all)
            │       │
            │       ├── First actual database connection is made HERE
            │       ├── SQLAlchemy inspects Base.metadata for all registered models
            │       │       (This is why app/models/__init__.py imports every model)
            │       ├── For each model, checks if the table exists
            │       │       ├── If table exists → skip
            │       │       └── If table missing → CREATE TABLE with all columns
            │       └── Transaction commits automatically (engine.begin context)
            │
            ├── Step 3: Log Startup
            │       logger.info("application_started", app_name=..., version=..., environment=...)
            │
            └── yield ← Application is now ready to serve requests
```

**After `yield`**: The server starts accepting HTTP connections.

---

## Phase 3: Serving Requests

```
HTTP Request arrives
    │
    ├── Uvicorn parses HTTP headers and body
    │
    ├── Middleware stack executes (order: LIFO for request, FIFO for response):
    │       1. ServerErrorMiddleware (catches unhandled errors)
    │       2. CORSMiddleware (adds Access-Control-Allow-* headers)
    │       3. ExceptionMiddleware (converts exceptions to responses)
    │
    ├── FastAPI path matching:
    │       Compares request path against all registered routes
    │       └── If no match → 404 Not Found
    │
    ├── Dependency injection:
    │       For each Depends() parameter in the route handler:
    │       │
    │       ├── get_db() is called:
    │       │       1. async_session_factory() creates a new AsyncSession
    │       │       2. Session is yielded to the handler
    │       │       (cleanup runs AFTER the handler returns — see below)
    │       │
    │       └── Other dependencies resolved (e.g., validate_bearer_token for gateway)
    │
    ├── Request body validation:
    │       Pydantic parses JSON body into the declared schema
    │       └── If invalid → RequestValidationError → 422 response
    │
    ├── Route handler executes:
    │       Handler function runs with injected dependencies
    │       └── Typically: creates service → calls service method → returns response
    │
    ├── Response serialization:
    │       Pydantic model is serialized to JSON
    │       Content-Type header set to application/json
    │
    └── Dependency cleanup:
            get_db() continues after yield:
            ├── If handler succeeded → await session.commit()
            └── If handler raised → await session.rollback()
            Session is closed automatically (async with context)
```

### Session Lifecycle Per Request

```
Request starts
    ↓
AsyncSession created (from pool or new connection)
    ↓
Session yielded to handler
    ↓
Handler calls service → service calls repository → repository calls session
    ↓
All repository operations use flush() (writes SQL but doesn't commit)
    ↓
Handler returns successfully
    ↓
get_db() calls session.commit() → ALL changes saved atomically
    ↓
AsyncSession returned to connection pool
    ↓
Response sent to client
```

If anything fails:
```
Handler raises an exception
    ↓
get_db() calls session.rollback() → ALL changes undone
    ↓
Exception propagates to error handler
    ↓
Error handler returns APIError JSON response
    ↓
AsyncSession returned to connection pool
```

---

## Phase 4: Shutdown (Lifespan Exit)

```
Ctrl+C pressed (or docker stop, or SIGTERM)
    │
    └── Uvicorn signals shutdown
            │
            ├── Stops accepting new connections
            ├── Waits for in-flight requests to complete (graceful shutdown)
            │
            └── Lifespan context manager resumes after yield:
                    │
                    └── logger.info("application_shutdown")
                    │
                    └── Context manager exits
                            │
                            └── Engine is NOT explicitly disposed
                                (Python garbage collector handles it)
```

**Note**: The current shutdown is minimal — just a log message. In a production setup, you might want to:
- Explicitly dispose the SQLAlchemy engine (`await engine.dispose()`)
- Close any background tasks
- Flush any pending logs

---

## Reload Mode (Development)

When running with `--reload`, Uvicorn watches for file changes:

```
Developer saves a .py file
    ↓
Uvicorn detects the change
    ↓
Current process is stopped (shutdown phase)
    ↓
New process is started (loading phase + startup phase)
    ↓
All module-level state is reset:
    - get_settings.cache_clear() is NOT called, but the entire process is new
    - database.engine is recreated
    - Base.metadata.create_all() runs again (no-op if tables exist)
```

**Important**: `--reload` creates a BRAND NEW Python process. This means:
- `@lru_cache` caches are fresh
- In-memory state is lost
- Database connections are all new
- This is why `lru_cache` works correctly even after code changes — the entire process restarts.

---

## Timeline Summary

```
t=0ms     uvicorn starts, Python begins importing modules
t=50ms    app/core/config.py imported (Settings class defined)
t=100ms   app/core/database.py imported (get_settings() called, .env read, engine created)
t=200ms   All route modules imported (services, schemas, models loaded)
t=250ms   create_application() runs (FastAPI instance created, middleware/routes wired)
t=300ms   Lifespan enters: logging configured
t=400ms   First database connection made (create_all)
t=500ms   Tables verified/created
t=550ms   "application_started" logged
t=600ms   Server accepting connections on :8000
          ─── Serving requests ───
t=???     Ctrl+C pressed
t=???+1   "application_shutdown" logged
t=???+2   Process exits
```
