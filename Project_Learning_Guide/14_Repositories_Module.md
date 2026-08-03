# 14 — Repositories Module Deep Dive

Every file in `app/storage/` explained.

Repositories are the **data access layer** — the only place in the application that talks directly to the database. If you want to read from or write to any table, you go through a repository.

---

## File: `app/storage/base_repository.py`

**Purpose**: Generic base class that provides CRUD operations for ANY model. Every other repository inherits from this.

### The Generic Type Pattern

```python
from typing import Any, Generic, TypeVar
from app.models.base import Base

T = TypeVar("T", bound=Base)

class BaseRepository(Generic[T]):
    model: type[T]
```

**What this means in plain English**:
- `T` is a placeholder for "any SQLAlchemy model" (like `ModelRecord`, `SessionRecord`, etc.)
- `Generic[T]` means this class can be used with different model types
- `model: type[T]` — each subclass sets this to their specific model class

**Example**:
```python
class ModelRepository(BaseRepository[ModelRecord]):
    model = ModelRecord
    # Now T = ModelRecord everywhere in BaseRepository
    # get_by_id() returns ModelRecord | None
    # get_all() returns list[ModelRecord]
    # create() returns ModelRecord
```

### Constructor

```python
def __init__(self, session: AsyncSession) -> None:
    self.session = session
```

Every repository receives an `AsyncSession` (database connection). This session is shared across all repositories in a single request — which means all operations in one request are part of a single database transaction.

### Method: `get_by_id()`

```python
async def get_by_id(self, record_id: str) -> T | None:
    """Fetch a single record by primary key."""
    return await self.session.get(self.model, record_id)
```

- `session.get(ModelRecord, "abc-123")` → executes `SELECT * FROM models WHERE id = 'abc-123'`
- Returns the record or `None` if not found.
- **Optimization**: `session.get()` checks the session's **identity map** first (in-memory cache of already-loaded objects). If the object was already loaded in this session, it returns it without hitting the database.

### Method: `get_all()`

```python
async def get_all(self, limit: int = 100, offset: int = 0) -> list[T]:
    """Fetch all records with pagination."""
    stmt = select(self.model).limit(limit).offset(offset)
    result = await self.session.execute(stmt)
    return list(result.scalars().all())
```

- Builds a SQL query: `SELECT * FROM {table} LIMIT 100 OFFSET 0`
- `result.scalars()`: Extracts just the model objects (not full result rows).
- `list(...)`: Converts from SQLAlchemy's internal sequence to a Python list.
- Default: returns the first 100 records.

### Method: `create()`

```python
async def create(self, **kwargs: Any) -> T:
    """Create and persist a new record."""
    instance = self.model(**kwargs)
    self.session.add(instance)
    await self.session.flush()
    await self.session.refresh(instance)
    return instance
```

Step by step:
1. `self.model(**kwargs)`: Creates a Python object (e.g., `ModelRecord(name="GPT-4", ...)`)
2. `self.session.add(instance)`: Marks it for insertion (doesn't execute SQL yet)
3. `await self.session.flush()`: Executes the `INSERT` SQL but does NOT commit the transaction
4. `await self.session.refresh(instance)`: Re-reads the row from the database to get server-generated values (like `created_at` from `server_default=func.now()`)
5. Returns the instance with all fields populated

**Why `flush()` not `commit()`?** 
- `flush()` writes to the database but keeps the transaction open.
- `commit()` finalizes the transaction. 
- We want the `get_db()` dependency to handle `commit()` after ALL operations in the request succeed. If one operation fails, we want ALL operations to rollback together.

### Method: `update()`

```python
async def update(self, record_id: str, **kwargs: Any) -> T | None:
    """Update an existing record by ID."""
    instance = await self.get_by_id(record_id)
    if instance is None:
        return None
    for key, value in kwargs.items():
        if hasattr(instance, key):
            setattr(instance, key, value)
    await self.session.flush()
    await self.session.refresh(instance)
    return instance
```

Step by step:
1. Fetches the record by ID
2. If not found, returns `None` (caller decides what to do — usually raise 404)
3. For each provided field, sets it on the instance: `instance.name = "New Name"`
4. `hasattr()` check prevents setting nonexistent attributes
5. `flush()` executes `UPDATE models SET name = 'New Name' WHERE id = '...'`
6. `refresh()` re-reads the updated row

### Method: `delete()`

```python
async def delete(self, record_id: str) -> bool:
    """Delete a record by ID. Returns True if found and deleted."""
    instance = await self.get_by_id(record_id)
    if instance is None:
        return False
    await self.session.delete(instance)
    await self.session.flush()
    return True
```

- Returns `False` if the record doesn't exist.
- `session.delete()` marks for deletion.
- `flush()` executes `DELETE FROM models WHERE id = '...'`.
- If there are cascade relationships (like sessions → messages), related records are deleted too.

### Method: `count()`

```python
async def count(self) -> int:
    """Return the total number of records."""
    from sqlalchemy import func
    
    stmt = select(func.count()).select_from(self.model)
    result = await self.session.execute(stmt)
    return result.scalar_one()
```

- Executes `SELECT COUNT(*) FROM {table}`
- `scalar_one()`: Returns the single scalar value (the count number)
- Note: `func` is imported inside the method (lazy import) to avoid circular imports

---

## File: `app/storage/session_repository.py`

**Purpose**: Extends `BaseRepository` for sessions with eager loading of messages.

```python
class SessionRepository(BaseRepository[SessionRecord]):
    model = SessionRecord

    async def get_with_messages(self, session_id: str) -> SessionRecord | None:
        stmt = (
            select(SessionRecord)
            .options(selectinload(SessionRecord.messages))
            .where(SessionRecord.id == session_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
```

### What is `selectinload`?

By default, SQLAlchemy uses **lazy loading** — relationships (like `session.messages`) are not loaded until you access them. But with async, lazy loading doesn't work (it requires synchronous database access).

`selectinload` tells SQLAlchemy: "Load the messages at the same time as the session, using a second SQL query."

**Without `selectinload`**:
```sql
SELECT * FROM sessions WHERE id = '...'
-- Later, when you access session.messages:
-- ERROR: async lazy loading not supported
```

**With `selectinload`**:
```sql
SELECT * FROM sessions WHERE id = '...'
SELECT * FROM messages WHERE session_id IN ('...')  -- automatically executed
```

### `MessageRepository`:

```python
class MessageRepository(BaseRepository[MessageRecord]):
    model = MessageRecord

    async def get_by_session(self, session_id: str) -> list[MessageRecord]:
        stmt = (
            select(MessageRecord)
            .where(MessageRecord.session_id == session_id)
            .order_by(MessageRecord.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
```

- Custom query: get all messages for a session, ordered chronologically.
- `.order_by(MessageRecord.created_at.asc())`: Oldest messages first (chat history reads top-to-bottom).

---

## File: `app/storage/api_key_repository.py`

```python
class ApiKeyRepository(BaseRepository[ApiKeyRecord]):
    model = ApiKeyRecord

    async def get_all_active(self) -> list[ApiKeyRecord]:
        stmt = select(ApiKeyRecord).where(ApiKeyRecord.is_active.is_(True))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_prefix(self, prefix: str) -> ApiKeyRecord | None:
        stmt = select(ApiKeyRecord).where(ApiKeyRecord.key_prefix == prefix)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
```

- `get_all_active()`: Only returns active keys (`is_active=True`).
- `get_by_prefix()`: The fast O(1) lookup used during API key validation.

---

## File: `app/storage/model_repository.py`

```python
class ModelRepository(BaseRepository[ModelRecord]):
    model = ModelRecord
```

**The simplest repository.** No custom methods — it only uses the inherited CRUD from `BaseRepository`. This is perfectly fine because the model registry doesn't need any specialized queries.

---

## File: `app/storage/knowledge_repository.py`

```python
class KnowledgeRepository(BaseRepository[KnowledgeSourceRecord]):
    model = KnowledgeSourceRecord
```

Also simple — no custom methods needed.

---

## File: `app/storage/memory_repository.py`

```python
class MemoryNodeRepository(BaseRepository[MemoryNodeRecord]):
    model = MemoryNodeRecord

    async def get_by_tier(self, tier: str) -> list[MemoryNodeRecord]:
        stmt = select(MemoryNodeRecord).where(MemoryNodeRecord.tier == tier)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class MemoryConnectionRepository(BaseRepository[MemoryConnectionRecord]):
    model = MemoryConnectionRecord

    async def get_connections_for_node(self, node_id: str) -> list[MemoryConnectionRecord]:
        stmt = select(MemoryConnectionRecord).where(
            MemoryConnectionRecord.source_node_id == node_id
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
```

- `get_by_tier()`: Filter nodes by memory tier ("Conversation", "Semantic", "Long-Term").
- `get_connections_for_node()`: Get all **outgoing** connections from a specific node. Note: this only gets outgoing edges (where `source_node_id` matches), not incoming.

---

## File: `app/storage/workflow_repository.py`

```python
class WorkflowRepository(BaseRepository[WorkflowRecord]):
    model = WorkflowRecord

    async def get_with_steps(self, workflow_id: str) -> WorkflowRecord | None:
        stmt = (
            select(WorkflowRecord)
            .options(selectinload(WorkflowRecord.steps))
            .where(WorkflowRecord.id == workflow_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_with_steps(self, limit: int = 100) -> list[WorkflowRecord]:
        stmt = (
            select(WorkflowRecord)
            .options(selectinload(WorkflowRecord.steps))
            .limit(limit)
            .order_by(WorkflowRecord.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class WorkflowStepRepository(BaseRepository[WorkflowStepRecord]):
    model = WorkflowStepRecord
```

Same pattern as `SessionRepository` — eager loading of steps using `selectinload`.

---

## File: `app/storage/request_log_repository.py`

```python
class RequestLogRepository(BaseRepository[RequestLogRecord]):
    model = RequestLogRecord

    async def get_recent(self, limit: int = 50) -> list[RequestLogRecord]:
        stmt = (
            select(RequestLogRecord)
            .order_by(RequestLogRecord.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def delete_all(self) -> int:
        from sqlalchemy import delete, func

        count_stmt = select(func.count()).select_from(RequestLogRecord)
        count_result = await self.session.execute(count_stmt)
        count = count_result.scalar_one()
        stmt = delete(RequestLogRecord)
        await self.session.execute(stmt)
        await self.session.flush()
        return count
```

- `get_recent()`: Most recent logs first (newest at top).
- `delete_all()`: Counts all records, then deletes them all. Returns the count of deleted records. This is used by the "Clear API Logs" button in the frontend.

---

## File: `app/storage/misc_repositories.py`

Contains four small repositories:

```python
class BenchmarkRepository(BaseRepository[BenchmarkRecord]):
    model = BenchmarkRecord
    # No custom methods

class LogEntryRepository(BaseRepository[LogEntryRecord]):
    model = LogEntryRecord
    
    async def get_recent(self, limit: int = 100) -> list[LogEntryRecord]:
        # Returns most recent log entries, newest first

class MemoryLogRepository(BaseRepository[MemoryLogRecord]):
    model = MemoryLogRecord
    
    async def get_recent(self, limit: int = 50) -> list[MemoryLogRecord]:
        # Returns most recent memory logs, newest first

class SettingsRepository(BaseRepository[SystemSettingRecord]):
    model = SystemSettingRecord
    
    async def get_by_key(self, key: str) -> SystemSettingRecord | None:
        # Find a setting by its unique key
    
    async def upsert(self, key: str, value: str) -> SystemSettingRecord:
        # Insert if key doesn't exist, update if it does
    
    async def get_all_as_dict(self) -> dict[str, str]:
        # Returns ALL settings as a Python dictionary {key: value}
```

### Notable: `SettingsRepository.upsert()`

```python
async def upsert(self, key: str, value: str) -> SystemSettingRecord:
    existing = await self.get_by_key(key)
    if existing:
        existing.value = value
        await self.session.flush()
        await self.session.refresh(existing)
        return existing
    return await self.create(key=key, value=value)
```

**"Upsert" = Update + Insert**: If the setting already exists, update its value. If it doesn't exist, create a new one. This is a common pattern for key-value stores.

---

## Repository Hierarchy Summary

```
BaseRepository[T]   (76 lines — generic CRUD)
    │
    ├── ModelRepository          (11 lines — no custom methods)
    ├── KnowledgeRepository      (11 lines — no custom methods)
    ├── BenchmarkRepository      (3 lines — no custom methods)
    │
    ├── SessionRepository        (37 lines — adds eager loading)
    ├── MessageRepository        (15 lines — adds session filter)
    │
    ├── ApiKeyRepository         (17 lines — adds active/prefix filters)
    ├── RequestLogRepository     (27 lines — adds recent/delete_all)
    │
    ├── MemoryNodeRepository     (10 lines — adds tier filter)
    ├── MemoryConnectionRepository (12 lines — adds node connections)
    │
    ├── WorkflowRepository       (24 lines — adds eager step loading)
    ├── WorkflowStepRepository   (4 lines — no custom methods)
    │
    ├── LogEntryRepository       (11 lines — adds recent)
    ├── MemoryLogRepository      (11 lines — adds recent)
    └── SettingsRepository       (20 lines — adds upsert, key lookup, dict conversion)
```

**Total**: 14 repositories. 5 are simple (no custom methods). 9 add domain-specific queries.

---

## How Repositories Connect to Everything Else

```
Route Handler
    ↓ (Depends(get_db) provides AsyncSession)
Service
    ↓ (passes session to repository constructor)
Repository
    ↓ (uses session to execute SQL)
SQLAlchemy AsyncSession
    ↓ (sends queries to database engine)
Database (SQLite or PostgreSQL)
```

All repositories in a single HTTP request share the SAME session, which means they participate in the SAME transaction. This is why `flush()` is used (not `commit()`) — the transaction is committed once at the end of the request by `get_db()`.
