# 07 — Database

Every table, every column, every relationship, every query pattern.

---

## Database Engine Selection

The application supports two database backends:

| Engine | Driver | When Used | Connection String |
|--------|--------|-----------|-------------------|
| **SQLite** | `aiosqlite` | Development (default) | `sqlite+aiosqlite:///./openmind.db` |
| **PostgreSQL 16** | `asyncpg` | Production (Docker) | `postgresql+asyncpg://user:pass@host:5432/db` |

The engine is selected by the `DATABASE_URL` environment variable in `.env`. The code in `database.py` auto-detects which engine is being used:

```python
if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update({"pool_size": 10, "max_overflow": 20, ...})
```

---

## Complete Schema: All 11 Tables

### Table 1: `models` — AI Model Registry

| Column | Type | Default | Nullable | Constraints |
|--------|------|---------|----------|-------------|
| `id` | VARCHAR(36) | `uuid4()` | NO | PRIMARY KEY |
| `name` | VARCHAR(100) | — | NO | — |
| `provider` | VARCHAR(50) | — | NO | — |
| `type` | VARCHAR(50) | `"text"` | YES | — |
| `context_window` | INTEGER | `8192` | YES | — |
| `parameters` | VARCHAR(50) | `""` | YES | — |
| `latency_ms` | INTEGER | `50` | YES | — |
| `vram_required_gb` | FLOAT | `0.0` | YES | — |
| `rpm_limit` | INTEGER | `1000` | YES | — |
| `status` | VARCHAR(50) | `"Deployed"` | YES | — |
| `description` | TEXT | `""` | YES | — |
| `created_at` | DATETIME(tz) | `now()` | YES | server_default |
| `updated_at` | DATETIME(tz) | `now()` | YES | server_default, onupdate |

**Relationships**: None (standalone table).
**Seed data**: 7 models (Llama 3, Mistral, DeepSeek R1, Gemini 2.0/3.5, GPT-4o, CLIP).

---

### Table 2: `sessions` — Chat Sessions

| Column | Type | Default | Nullable | Constraints |
|--------|------|---------|----------|-------------|
| `id` | VARCHAR(36) | `uuid4()` | NO | PRIMARY KEY |
| `title` | VARCHAR(200) | — | NO | — |
| `model_id` | VARCHAR(100) | `"default"` | YES | — |
| `temperature` | FLOAT | `0.7` | YES | — |
| `max_tokens` | INTEGER | `1024` | YES | — |
| `top_p` | FLOAT | `0.9` | YES | — |
| `presence_penalty` | FLOAT | `0.0` | YES | — |
| `json_mode` | BOOLEAN | `False` | YES | — |
| `created_at` | DATETIME(tz) | `now()` | YES | server_default |
| `updated_at` | DATETIME(tz) | `now()` | YES | server_default, onupdate |

**Relationships**: One-to-many → `messages` (cascade delete).

---

### Table 3: `messages` — Chat Messages

| Column | Type | Default | Nullable | Constraints |
|--------|------|---------|----------|-------------|
| `id` | VARCHAR(36) | `uuid4()` | NO | PRIMARY KEY |
| `session_id` | VARCHAR(36) | — | NO | FOREIGN KEY → sessions.id (CASCADE) |
| `role` | VARCHAR(20) | — | NO | "system", "user", "assistant" |
| `content` | TEXT | — | NO | — |
| `created_at` | DATETIME(tz) | `now()` | YES | server_default |
| `updated_at` | DATETIME(tz) | `now()` | YES | server_default, onupdate |

**Relationships**: Many-to-one → `sessions`.

---

### Table 4: `api_keys` — Platform API Keys

| Column | Type | Default | Nullable | Constraints |
|--------|------|---------|----------|-------------|
| `id` | VARCHAR(36) | `uuid4()` | NO | PRIMARY KEY |
| `name` | VARCHAR(100) | — | NO | — |
| `key_hash` | VARCHAR(200) | — | NO | bcrypt hash |
| `key_prefix` | VARCHAR(20) | — | NO | First 12 chars |
| `is_active` | BOOLEAN | `True` | YES | — |
| `last_used` | VARCHAR(50) | `"Never"` | YES | — |
| `created_at` | DATETIME(tz) | `now()` | YES | server_default |
| `updated_at` | DATETIME(tz) | `now()` | YES | server_default, onupdate |

**Relationships**: None (standalone table).

---

### Table 5: `knowledge_sources` — Uploaded Documents

| Column | Type | Default | Nullable | Constraints |
|--------|------|---------|----------|-------------|
| `id` | VARCHAR(36) | `uuid4()` | NO | PRIMARY KEY |
| `name` | VARCHAR(255) | — | NO | — |
| `type` | VARCHAR(50) | — | NO | "PDF", "MD", "TXT" |
| `size_bytes` | INTEGER | `0` | YES | — |
| `chunks_count` | INTEGER | `0` | YES | — |
| `embedding_size` | INTEGER | `1024` | YES | — |
| `status` | VARCHAR(50) | `"Indexed"` | YES | — |
| `progress` | FLOAT | `100.0` | YES | — |
| `file_path` | VARCHAR(500) | — | YES | Only nullable field |
| `created_at` | DATETIME(tz) | `now()` | YES | server_default |
| `updated_at` | DATETIME(tz) | `now()` | YES | server_default, onupdate |

**Relationships**: None (standalone table).

---

### Table 6: `workflows` — Workflow Definitions

| Column | Type | Default | Nullable | Constraints |
|--------|------|---------|----------|-------------|
| `id` | VARCHAR(36) | `uuid4()` | NO | PRIMARY KEY |
| `name` | VARCHAR(150) | — | NO | — |
| `description` | TEXT | `""` | YES | — |
| `trigger` | VARCHAR(100) | `""` | YES | — |
| `status` | VARCHAR(50) | `"Active"` | YES | — |
| `last_run` | VARCHAR(50) | `""` | YES | — |
| `created_at` | DATETIME(tz) | `now()` | YES | server_default |
| `updated_at` | DATETIME(tz) | `now()` | YES | server_default, onupdate |

**Relationships**: One-to-many → `workflow_steps` (cascade delete).

---

### Table 7: `workflow_steps` — Workflow Steps

| Column | Type | Default | Nullable | Constraints |
|--------|------|---------|----------|-------------|
| `id` | VARCHAR(36) | `uuid4()` | NO | PRIMARY KEY |
| `workflow_id` | VARCHAR(36) | — | NO | FOREIGN KEY → workflows.id (CASCADE) |
| `name` | VARCHAR(150) | — | NO | — |
| `type` | VARCHAR(50) | — | NO | "LLM", "Condition", "API_Call", etc. |
| `config` | TEXT | `"{}"` | YES | JSON-encoded step config |
| `order` | INTEGER | `0` | YES | Execution order |
| `created_at` | DATETIME(tz) | `now()` | YES | server_default |
| `updated_at` | DATETIME(tz) | `now()` | YES | server_default, onupdate |

**Relationships**: Many-to-one → `workflows`.

---

### Table 8: `memory_nodes` — Graph Memory Nodes

| Column | Type | Default | Nullable | Constraints |
|--------|------|---------|----------|-------------|
| `id` | VARCHAR(36) | `uuid4()` | NO | PRIMARY KEY |
| `label` | VARCHAR(150) | — | NO | — |
| `tier` | VARCHAR(50) | — | NO | "Conversation", "Semantic", "Long-Term" |
| `category` | VARCHAR(50) | `""` | YES | — |
| `value` | TEXT | — | NO | — |
| `created_at` | DATETIME(tz) | `now()` | YES | server_default |
| `updated_at` | DATETIME(tz) | `now()` | YES | server_default, onupdate |

**Relationships**: Referenced by `memory_connections` (no ORM relationship defined).

---

### Table 9: `memory_connections` — Graph Edges

| Column | Type | Default | Nullable | Constraints |
|--------|------|---------|----------|-------------|
| `id` | VARCHAR(36) | `uuid4()` | NO | PRIMARY KEY |
| `source_node_id` | VARCHAR(36) | — | NO | FOREIGN KEY → memory_nodes.id (CASCADE) |
| `target_node_id` | VARCHAR(36) | — | NO | FOREIGN KEY → memory_nodes.id (CASCADE) |
| `created_at` | DATETIME(tz) | `now()` | YES | server_default |
| `updated_at` | DATETIME(tz) | `now()` | YES | server_default, onupdate |

**Relationships**: Two foreign keys to `memory_nodes` (no ORM relationship — FK only).

---

### Table 10: `memory_logs` — Memory Operation Logs

| Column | Type | Default | Nullable | Constraints |
|--------|------|---------|----------|-------------|
| `id` | VARCHAR(36) | `uuid4()` | NO | PRIMARY KEY |
| `tier` | VARCHAR(50) | — | NO | — |
| `operation` | VARCHAR(50) | — | NO | "Read", "Write", "Prune", "Consolidate" |
| `text` | TEXT | — | NO | — |
| `created_at` | DATETIME(tz) | `now()` | YES | server_default |
| `updated_at` | DATETIME(tz) | `now()` | YES | server_default, onupdate |

---

### Table 11: `benchmarks` — Performance Data

| Column | Type | Default | Nullable | Constraints |
|--------|------|---------|----------|-------------|
| `id` | VARCHAR(36) | `uuid4()` | NO | PRIMARY KEY |
| `model_id` | VARCHAR(100) | — | YES | — |
| `model_name` | VARCHAR(150) | — | YES | — |
| `ttft_ms` | FLOAT | — | YES | Time to First Token |
| `tps` | FLOAT | — | YES | Tokens per Second |
| `latency_ms` | FLOAT | — | YES | — |
| `accuracy` | FLOAT | — | YES | Percentage |
| `vram_gb` | FLOAT | — | YES | — |
| `cost_per_1k` | FLOAT | — | YES | — |
| `created_at` | DATETIME(tz) | `now()` | YES | server_default |
| `updated_at` | DATETIME(tz) | `now()` | YES | server_default, onupdate |

### Additional Tables

**`log_entries`**: System event logs (severity, source, message, metadata_json).

**`request_logs`**: API request logs (method, url, status, time_ms, size_bytes, request/response bodies).

**`system_settings`**: Key-value configuration store (key UNIQUE, value).

---

## Entity Relationship Diagram

```
┌──────────┐           ┌──────────┐
│ sessions │──1:N────▶│ messages │
│          │           │          │
│ id (PK)  │◀──FK──── │session_id│
└──────────┘           └──────────┘

┌───────────┐           ┌────────────────┐
│ workflows │──1:N────▶│ workflow_steps │
│           │           │                │
│ id (PK)   │◀──FK──── │ workflow_id    │
└───────────┘           └────────────────┘

┌──────────────┐        ┌─────────────────────┐
│ memory_nodes │◀──FK── │ memory_connections  │
│              │        │                     │
│ id (PK)      │◀──FK── │ source_node_id     │
│              │        │ target_node_id      │
└──────────────┘        └─────────────────────┘

Standalone tables (no foreign keys):
  models, api_keys, knowledge_sources, benchmarks,
  log_entries, request_logs, memory_logs, system_settings
```

---

## How Tables Are Created

Tables are NOT created via migration scripts. They are created at startup:

```python
# app/core/lifespan.py
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
```

`create_all()` uses `CREATE TABLE IF NOT EXISTS` — it creates missing tables but NEVER modifies existing ones. This means:
- ✅ Adding a new model class automatically creates its table on next startup.
- ❌ Adding a new column to an existing model does NOT add it to the table.
- ❌ Renaming a column does NOT rename it in the table.
- To apply schema changes to existing tables, you must delete the database and let it recreate, or use Alembic (not configured yet).

---

## Transaction Management

Every HTTP request gets ONE database transaction:

```
Request → get_db() opens session → [handler operations] → commit or rollback → response
```

Within that transaction:
- `session.flush()` → writes SQL to database (within transaction)
- `session.commit()` → finalizes transaction (called by get_db())
- `session.rollback()` → undoes everything (called by get_db() on error)

Multiple repositories sharing the same session = same transaction = atomic operations.
