# 22 — Glossary

Every technical term used in this project, explained in plain language.

---

## A

**ASGI** — Asynchronous Server Gateway Interface. The standard that FastAPI follows for handling HTTP. Think of it as the contract between Uvicorn (the server) and FastAPI (the application).

**async/await** — Python keywords for asynchronous programming. `async def` declares a function that can pause and resume (while waiting for I/O). `await` pauses execution until the awaited operation completes. This lets the server handle many requests simultaneously.

**AsyncGenerator** — A function that uses both `async` and `yield`. It produces values over time, asynchronously. Used for SSE streaming in `ChatService.stream_response()`.

**AsyncSession** — SQLAlchemy's asynchronous database session. It wraps a database connection and manages a transaction. Created by `get_db()` for each request.

**async_sessionmaker** — A factory that creates `AsyncSession` instances with preset configuration. Defined once in `database.py`, used everywhere via `get_db()`.

---

## B

**BaseModel** — Pydantic's base class for data validation. All schemas (request/response models) inherit from it. Automatically validates types, applies defaults, and serializes to JSON.

**BaseRepository** — The generic base class in `app/storage/base_repository.py` that provides CRUD operations. All repositories inherit from it.

**BaseSettings** — From `pydantic-settings`. Like `BaseModel` but reads field values from environment variables instead of constructors.

**bcrypt** — A password hashing algorithm. Used to securely hash API keys so they can be verified without storing the raw key.

**Bearer Token** — An authentication mechanism where the token is sent in the HTTP header: `Authorization: Bearer <token>`. Used by the OpenAI-compatible gateway.

---

## C

**CASCADE (delete)** — When a parent record is deleted, all child records are automatically deleted too. Example: deleting a session automatically deletes all its messages.

**CORS** — Cross-Origin Resource Sharing. Browser security that blocks requests from one domain to another. The `CORSMiddleware` in `main.py` relaxes this to allow the frontend (port 3000) to call the backend (port 8000).

**create_all()** — SQLAlchemy method that creates database tables based on model definitions. Uses `CREATE TABLE IF NOT EXISTS`, so it's safe to call repeatedly.

**CRUD** — Create, Read, Update, Delete. The four basic database operations.

---

## D

**DTO** — Data Transfer Object. A class used solely to transfer data between layers. In this project, Pydantic schemas serve as DTOs between the API layer and the service layer.

**DeclarativeBase** — SQLAlchemy 2.0's base class for ORM models. Provides the metadata registry that tracks all table definitions.

**Depends()** — FastAPI's dependency injection mechanism. Declares that a function parameter should be provided by calling another function. Example: `session: AsyncSession = Depends(get_db)`.

**Dependency Injection (DI)** — A design pattern where an object receives its dependencies instead of creating them. FastAPI's `Depends()` is the DI mechanism used throughout.

---

## E

**Eager Loading** — Loading related data at the same time as the main query. Example: loading a session AND its messages in one operation using `selectinload`. Opposite of "lazy loading."

**Engine** — SQLAlchemy's connection pool manager. Created by `create_async_engine()`. Manages a pool of database connections that are reused across requests.

---

## F

**FastAPI** — The Python web framework used for the backend. Built on top of Starlette (ASGI) and Pydantic (validation). Key features: automatic OpenAPI docs, type-safe request validation, async support.

**Field()** — Pydantic function for configuring model fields. Accepts default values, validators, descriptions, and examples.

**flush()** — SQLAlchemy method that sends pending SQL to the database WITHOUT committing the transaction. Used by repositories so that the final `commit()` is handled by `get_db()`.

**Foreign Key (FK)** — A database column that references the primary key of another table. Example: `messages.session_id` references `sessions.id`.

---

## G

**Generic[T]** — Python typing feature for creating type-parameterized classes. `BaseRepository[T]` works with any model type `T`.

**Gemini** — Google's family of AI models. This project uses the Gemini API (via `google-generativeai`) for chat completions.

**get_db()** — The most important FastAPI dependency. An async generator that provides a database session and handles commit/rollback after the request.

**get_settings()** — Returns the cached `Settings` singleton. Decorated with `@lru_cache` so `.env` is only read once.

---

## H

**HTTPException** — FastAPI's exception class for returning HTTP errors. `raise HTTPException(status_code=404, detail="Not found")` returns a 404 response.

---

## I

**Identity Map** — SQLAlchemy's in-memory cache of loaded objects. If you call `session.get(Model, id)` twice with the same ID, the second call returns the cached object without a database query.

**Idempotent** — An operation that produces the same result no matter how many times you run it. The seed script is idempotent because it uses `merge()` (insert or update) instead of `add()` (insert only).

---

## L

**Lazy Loading** — Loading related data only when it's accessed. Default in SQLAlchemy, but doesn't work with async (raises an error). Use `selectinload` instead.

**Lifespan** — FastAPI's mechanism for running code at startup and shutdown. Defined as an `@asynccontextmanager` that yields.

**lru_cache** — Python decorator that caches function return values. "Least Recently Used" cache. `get_settings()` uses this to ensure the Settings object is created only once.

---

## M

**Mapped[T]** — SQLAlchemy 2.0 type annotation for ORM columns. `Mapped[str]` means the column is a string. Replaces the older `Column(String)` syntax.

**mapped_column()** — SQLAlchemy 2.0 function for defining column configuration (type, default, nullable, etc.).

**merge()** — SQLAlchemy session method. Inserts a new record if the primary key doesn't exist, updates it if it does. Used in the seed script for idempotent seeding.

**Middleware** — Code that runs for every request, before and after the route handler. `CORSMiddleware` adds CORS headers to every response.

**Mixin** — A class designed to be inherited by multiple other classes to add functionality. `TimestampMixin` adds `created_at`/`updated_at` to any model.

---

## O

**ORM** — Object-Relational Mapping. Technique that maps Python objects to database tables. SQLAlchemy is the ORM used in this project.

**OpenAPI** — A specification for describing REST APIs. FastAPI auto-generates an OpenAPI spec, which powers the Swagger UI at `/docs`.

---

## P

**Primary Key (PK)** — A column that uniquely identifies each row in a table. All tables in this project use UUID strings as primary keys.

**Proxy** — An intermediary server that forwards requests. Vite's dev server proxies API calls from port 3000 to the FastAPI backend on port 8000.

**Pydantic** — Python library for data validation. Validates types, applies defaults, and serializes to JSON. Used for all API schemas.

**psutil** — Python library for system monitoring. Used by `MonitoringService` to read CPU and RAM usage.

---

## R

**RAG** — Retrieval-Augmented Generation. Technique where you retrieve relevant documents and include them in the AI prompt. The knowledge module is the foundation for RAG, but full RAG is not implemented yet.

**Repository Pattern** — Design pattern where database access is encapsulated in dedicated "repository" classes. Routes never write SQL — they call repository methods.

---

## S

**scalar_one_or_none()** — SQLAlchemy method that returns exactly one result or None. Used when fetching a single record by ID.

**selectinload** — SQLAlchemy eager loading strategy. Loads related objects using a second `SELECT ... WHERE id IN (...)` query. Required for async because lazy loading doesn't work.

**server_default** — SQLAlchemy column option that sets the default value on the database server side (SQL `DEFAULT`), not in Python. More reliable for timestamps.

**session (database)** — An SQLAlchemy `AsyncSession` — a wrapper around a database connection with transaction management.

**session (chat)** — An application-level concept — a chat conversation with history, settings, and a title. Stored in the `sessions` table.

**SPA** — Single Page Application. The React frontend is an SPA — the browser loads one HTML page, and JavaScript handles all navigation without full page reloads.

**SSE** — Server-Sent Events. A protocol where the server pushes data to the client over a single HTTP connection. Format: `data: {...}\n\n`. Used for chat streaming.

**StreamingResponse** — FastAPI response class that sends data incrementally as it's generated, rather than waiting for the full response.

**structlog** — Python structured logging library. Log entries are key-value pairs (not just strings), which makes them easier to parse and query.

---

## T

**Transaction** — A group of database operations that either ALL succeed or ALL fail. In this project, one HTTP request = one transaction (managed by `get_db()`).

**TypeVar** — Python typing construct that defines a generic type variable. `T = TypeVar("T", bound=Base)` means `T` can be any class that inherits from `Base`.

---

## U

**UUID** — Universally Unique Identifier. A 36-character string like `550e8400-e29b-41d4-a716-446655440000`. All primary keys in this project are UUIDs generated by Python's `uuid.uuid4()`.

**Upsert** — A database operation that inserts a record if it doesn't exist, or updates it if it does. Implemented in `SettingsRepository.upsert()`.

**Uvicorn** — An ASGI server that runs FastAPI applications. Started with `uvicorn app.main:app --reload`.

---

## V

**Virtual Environment (venv)** — An isolated Python installation with its own packages. Created with `python -m venv .venv`. Ensures project dependencies don't conflict with other projects.

**Vite** — A frontend build tool that provides a fast dev server with hot module replacement. Used to serve the React frontend and proxy API calls.

---

## Y

**yield** — Python keyword used in generators. In `get_db()`, `yield session` provides the session to the route handler. Code before yield = setup. Code after yield = cleanup.
