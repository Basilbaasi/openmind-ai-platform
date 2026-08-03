# 20 — Known Issues & Code Observations

Issues, inconsistencies, dead code, and gaps found by analyzing every file in the repository against the actual source code.

> **Reminder**: This is documentation only. No code changes are suggested or made.

---

## 🔴 Critical Issues

### 1. GPU/VRAM Monitoring Always Returns Zero
**Location**: `app/services/monitoring_service.py`
**Issue**: `gpuUsage`, `vramTotal`, and `vramUsed` are hardcoded to `0` in the system status response. The frontend (`Dashboard.tsx`) renders VRAM partition bars that always show empty.
**Why**: No GPU monitoring library (like `pynvml`) is installed or used.

### 2. Workflow Execution Is Simulated
**Location**: `app/services/domain_services.py` → `WorkflowService.execute_workflow()`
**Issue**: The method iterates workflow steps and returns `"status": "completed"` for every step without actually executing anything. No LLM calls, no API calls, no condition evaluations.
**Why**: Workflow execution engine is not implemented yet.

### 3. Embedding Generation Returns Placeholder Data
**Location**: `app/api/routes/gateway.py` → `gateway_embeddings()`
**Issue**: The embedding endpoint returns `[0.0] * 1024` (a vector of 1024 zeros) for every input, regardless of content.
**Why**: No embedding model is integrated. `pgvector` is installed but not configured.

### 4. File Upload Size Not Enforced
**Location**: `app/core/config.py` line 45
**Issue**: `MAX_UPLOAD_SIZE_MB = 50` is defined but never checked. You can upload files of any size.
**Where it should be checked**: In `app/api/routes/knowledge.py` or as middleware.

---

## 🟡 Medium Issues

### 5. DEVELOPER_GUIDE.md Has Several Inaccuracies
| What the guide says | What the code actually does |
|--------------------|-----------------------------|
| `DEBUG: bool = True` | `DEBUG: bool = False` (config.py) |
| TimestampMixin uses `default=lambda: datetime.now(UTC)` | Uses `server_default=func.now()` |
| Workflow step column is `order_index` | Actual column is `order` |
| CI tests Python 3.12 and 3.13 | Actually tests 3.11 and 3.12 |
| CI job says "Set up Python 3.12" | But `python-version` is `"3.11"` |

### 6. CI YAML Has a Comment/Value Mismatch
**Location**: `.github/workflows/ci.yml` line 22-25
```yaml
      - name: Set up Python 3.12    # <-- Comment says 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"    # <-- Actually uses 3.11
```

### 7. Frontend `index.html` Title Mismatch
**Location**: `client/index.html` line 6
```html
<title>My Google AI Studio App</title>
```
This should probably be `"OpenMind AI Platform"` to match the project name.

### 8. Knowledge Chunks Are Counted But Not Stored
**Location**: `app/services/domain_services.py` → `KnowledgeService.upload_file()`
**Issue**: Text is extracted from documents and split into 512-character chunks, but only the `chunks_count` is saved to the database. The actual chunk content is discarded. For real RAG, you'd need to store and embed these chunks.

### 9. Metadata Field on SessionRecord Is Not a DB Column
**Location**: `app/schemas/sessions.py` defines `metadata: dict[str, Any]` in both request and response.
**Issue**: The `SessionRecord` ORM model does NOT have a `metadata` column. Instead, `SessionService` constructs the metadata dict from individual columns (`model_id`, `temperature`, `max_tokens`, etc.) during response building. This means:
- Frontend sends `metadata.model_id` in the request body
- Backend reads it from `request.model_id` (a direct field)
- Backend returns it inside `metadata` in the response
This round-trip works, but the naming can be confusing.

---

## 🟢 Minor Issues & Observations

### 10. Some Repositories Are One-Liners
**Files**: `model_repository.py`, `knowledge_repository.py`
**Observation**: These files contain a class that literally just sets `model = ModelRecord` and inherits everything from `BaseRepository`. While this follows the pattern consistently, some developers might prefer to put these in `misc_repositories.py` to reduce file count.

### 11. `chat.py` Route Uses Two Dependency Injection Styles
**Location**: `app/api/routes/chat.py`
**Observation**: The chat route creates the service manually inside the handler:
```python
async def generate_chat(request: ChatRequest, session: AsyncSession = Depends(get_db)):
    service = ChatService(session)  # Manual creation
```
While the gateway uses the same pattern. Some routes in other projects use a `get_service` dependency. The current approach is consistent across this project.

### 12. `data.ts` Contains Hardcoded Fallback Data
**Location**: `client/src/data.ts`
**Observation**: This file contains mock data (models, sessions, benchmarks, etc.) that the frontend uses when the backend is unavailable. If the backend schema changes, this file needs manual updates to stay in sync.

### 13. No Database Migration System
**Observation**: Alembic is listed in `requirements.txt` but there's no `alembic.ini`, no `migrations/` directory, and no migration scripts. Currently, `Base.metadata.create_all()` creates tables on startup, but this:
- Cannot modify existing tables (add/remove/rename columns)
- Cannot handle schema changes without deleting the database
- Is fine for development but unsuitable for production

### 14. Settings Service Stores Everything as Strings
**Location**: `app/models/setting.py`
```python
class SystemSettingRecord:
    key: Mapped[str]
    value: Mapped[str]   # Always a string
```
Numbers like `sessionTimeoutMin` and booleans are stored as strings and must be parsed by the consumer. This can lead to type confusion.

### 15. Error Handling in Gateway Differs from Main Routes
**Location**: `app/api/routes/gateway.py`
**Observation**: The gateway route uses raw `request.json()` instead of Pydantic validation. This means:
- Invalid payloads get Python errors, not clean Pydantic validation errors
- The error format might differ from the standard `APIError` schema
- Main routes (`/chat`) use Pydantic and get clean 422 errors automatically

### 16. Unused Imports/Dependencies
**Installed but not used in code**:
- `alembic` — installed, no migration scripts
- `pgvector` — installed, no vector operations
- `httpx` — installed, not used in any service (could be for future external API calls)

### 17. Monitoring Service DB Check Is Identical for Both Databases
**Location**: `app/services/monitoring_service.py`
```python
if self.settings.DATABASE_URL.startswith("sqlite"):
    await self.session.execute(text("SELECT 1"))
else:
    await self.session.execute(text("SELECT 1"))
```
Both branches execute the same query. The `if/else` is unnecessary for `SELECT 1` (it works on both SQLite and PostgreSQL), but it might be intended for future differentiation (e.g., PostgreSQL-specific health queries).

---

## Summary Table

| # | Severity | Category | File |
|---|----------|----------|------|
| 1 | 🔴 Critical | Missing Feature | `monitoring_service.py` |
| 2 | 🔴 Critical | Placeholder | `domain_services.py` |
| 3 | 🔴 Critical | Placeholder | `gateway.py` |
| 4 | 🔴 Critical | Security Gap | `config.py` / `knowledge.py` |
| 5 | 🟡 Medium | Documentation | `DEVELOPER_GUIDE.md` |
| 6 | 🟡 Medium | CI Bug | `ci.yml` |
| 7 | 🟡 Medium | UI Bug | `index.html` |
| 8 | 🟡 Medium | Incomplete Feature | `domain_services.py` |
| 9 | 🟡 Medium | Design Confusion | `sessions.py` schema/model |
| 10 | 🟢 Minor | Code Style | `model_repository.py` |
| 11 | 🟢 Minor | Consistency | `chat.py` route |
| 12 | 🟢 Minor | Maintenance | `data.ts` |
| 13 | 🟢 Minor | Missing Feature | No Alembic setup |
| 14 | 🟢 Minor | Type Safety | `setting.py` |
| 15 | 🟢 Minor | Error Handling | `gateway.py` |
| 16 | 🟢 Minor | Unused Code | `requirements.txt` |
| 17 | 🟢 Minor | Dead Code | `monitoring_service.py` |
