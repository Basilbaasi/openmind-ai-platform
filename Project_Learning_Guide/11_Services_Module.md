# 11 — Services Module Deep Dive

Every file in `app/services/` explained line-by-line.

The `services/` directory is the **brain** of the backend. It contains all business logic — AI calls, data transformation, validation beyond what Pydantic handles, and coordination between multiple repositories.

**Rule**: Route handlers should be "thin" — they receive HTTP, call a service, and return the response. Services should be "thick" — they contain all the real logic.

---

## File: `app/services/chat_service.py`

**Purpose**: The most important service. Handles chat completions (sync and streaming), Gemini AI integration, token counting, and message persistence.

### Complete line-by-line walkthrough:

```python
"""
Chat service.

Orchestrates prompt construction, model calls (Google Gemini), token
estimation, and optional session persistence for both blocking and
streaming chat completions.
"""
```
Lines 1-6: Docstring.

```python
import asyncio
import json
import time
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

import google.generativeai as genai
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.schemas.chat import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ChatStreamResponse,
    RoleEnum,
    TokenUsage,
)
from app.storage.session_repository import MessageRepository
```
Lines 8-25: **Imports**
- `asyncio`: For `asyncio.sleep()` in mock streaming.
- `json`: For serializing SSE data.
- `time`: For generating Unix timestamps.
- `uuid`: For generating unique chat completion IDs.
- `AsyncGenerator`: Type hint for the streaming method.
- `genai`: Google's Generative AI SDK.
- `structlog`: For logging.
- `AsyncSession`: Database session type.
- `get_settings`: To read the Gemini API key.
- All the Pydantic schemas for chat.
- `MessageRepository`: To persist messages in the database.

```python
logger = structlog.get_logger()
```
Line 27: Module-level logger.

```python
class ChatService:
    """Handles chat completions against the configured LLM."""

    def __init__(self, session: AsyncSession) -> None:
        self.db_session = session
        self.msg_repo = MessageRepository(session)
        self.settings = get_settings()
```
Lines 30-35: **Constructor**
- `self.db_session`: The database session (shared with other services in the same request).
- `self.msg_repo`: Repository for reading/writing `MessageRecord` rows.
- `self.settings`: Cached settings singleton.

```python
    def _get_gemini_model_name(self, model_id: str) -> str:
        """Map a platform model ID to a real Gemini model name."""
        if model_id and "gemini" in model_id.lower():
            return model_id
        return "gemini-2.0-flash"
```
Lines 37-41: **Model name mapping**
- If the user specifies a model ID containing "gemini" (e.g., `"gemini-3.5-pro"`), use it directly.
- Otherwise, default to `"gemini-2.0-flash"` (a fast, cheap model).
- This means ALL non-Gemini models (Llama 3, GPT-4o, etc.) are routed to Gemini. The model registry is for display purposes; actual inference goes through Gemini.

```python
    def _estimate_tokens(self, text: str) -> int:
        """Rough token count: ~1.3 tokens per word."""
        return int(len(text.split()) * 1.3)
```
Lines 43-45: **Token estimation**
- Not an exact count — just a heuristic.
- Used for the `usage` field in responses.
- Real token counting would require a tokenizer library (like `tiktoken`).

```python
    async def generate_response(self, request: ChatRequest) -> ChatResponse:
```
Line 47: **The synchronous (non-streaming) chat method.**

```python
        response_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
        created = int(datetime.now(UTC).timestamp())
```
Lines 49-50: Generate a unique ID and Unix timestamp for the response.
- `uuid.uuid4().hex[:12]`: Random 12-character hex string.
- Result: `"chatcmpl-a1b2c3d4e5f6"`

```python
        # Persist user turn if session-bound
        if request.session_id:
            last_user_msg = request.messages[-1] if request.messages else None
            if last_user_msg and last_user_msg.role == RoleEnum.user:
                await self.msg_repo.create(
                    session_id=request.session_id,
                    role="user",
                    content=last_user_msg.content,
                )
```
Lines 53-60: **Persist the user's message**
- Only if a `session_id` was provided (anonymous chats aren't persisted).
- Takes the last message from the array (assumes it's the user's latest input).
- Saves it to the `messages` database table.

```python
        content, usage = await self._call_gemini(request)
```
Line 62: **Call the AI model.** Returns the generated text and token usage.

```python
        # Persist assistant turn if session-bound
        if request.session_id:
            await self.msg_repo.create(
                session_id=request.session_id,
                role="assistant",
                content=content,
            )
```
Lines 65-70: **Persist the AI's response** (same logic as user message).

```python
        return ChatResponse(
            id=response_id,
            object="chat.completion",
            created=created,
            model=request.model,
            message=ChatMessage(role=RoleEnum.assistant, content=content),
            finish_reason="stop",
            usage=usage,
            session_id=request.session_id,
        )
```
Lines 72-81: **Build and return the response** as a Pydantic `ChatResponse` model.

### The `_call_gemini()` method:

```python
    async def _call_gemini(self, request: ChatRequest) -> tuple[str, TokenUsage]:
```
This is where the actual AI call happens.

**Two paths**:

**Path A — Real Gemini API** (when `GEMINI_API_KEY` is set):
```python
        if self.settings.GEMINI_API_KEY:
            genai.configure(api_key=self.settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(self._get_gemini_model_name(request.model))
            
            # Build prompt from messages
            prompt_parts = []
            for msg in request.messages:
                prompt_parts.append(f"{msg.role.value}: {msg.content}")
            prompt = "\n".join(prompt_parts)
            
            response = await model.generate_content_async(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=request.temperature,
                    max_output_tokens=request.max_tokens or 1024,
                ),
            )
            
            content = response.text
            usage = TokenUsage(
                prompt_tokens=self._estimate_tokens(prompt),
                completion_tokens=self._estimate_tokens(content),
                total_tokens=self._estimate_tokens(prompt) + self._estimate_tokens(content),
            )
```

**Path B — Mock Fallback** (when `GEMINI_API_KEY` is empty):
```python
        else:
            logger.warning("gemini_api_key_not_set", msg="Using mock response")
            content = (
                "This is a mock response from the OpenMind AI Platform. "
                "To enable real AI responses, set the GEMINI_API_KEY "
                "environment variable in your .env file."
            )
            usage = TokenUsage(
                prompt_tokens=self._estimate_tokens(str(request.messages)),
                completion_tokens=self._estimate_tokens(content),
                total_tokens=...,
            )
```

### The `stream_response()` method:

```python
    async def stream_response(self, request: ChatRequest) -> AsyncGenerator[str, None]:
```
This is an **async generator** — it uses `yield` instead of `return`, producing chunks over time.

**Key steps**:
1. Generate `response_id` and `created` timestamp
2. Persist user message (if session_id)
3. Check if Gemini API key is available:
   - **If yes**: Call `generate_content_async(stream=True)`, iterate async chunks
   - **If no**: Split mock text into words, yield with `asyncio.sleep(0.05)` delay
4. Each chunk is formatted as SSE:
   ```python
   chunk_data = ChatStreamResponse(
       id=response_id,
       object="chat.completion.chunk",
       created=created,
       model=request.model,
       chunk=chunk_text,
       session_id=request.session_id,
   )
   yield f"data: {chunk_data.model_dump_json()}\n\n"
   ```
5. After all chunks, persist the full assistant message
6. Yield final: `yield "data: [DONE]\n\n"`

---

## File: `app/services/session_service.py`

**Purpose**: Manages chat sessions and their messages.

```python
class SessionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session_repo = SessionRepository(session)
        self.message_repo = MessageRepository(session)
```

### Methods:

| Method | What it does |
|--------|-------------|
| `create_session(request)` | Creates a new `SessionRecord`, returns `SessionResponse` |
| `list_sessions()` | Returns all sessions with messages (eager loaded), returns `SessionListResponse` |
| `get_session(session_id)` | Gets a single session with messages, raises 404 if not found |
| `update_session(session_id, request)` | Updates session fields, raises 404 if not found |
| `delete_session(session_id)` | Deletes session (cascade deletes messages), raises 404 if not found |
| `add_message(session_id, request)` | Adds a message to a session, raises 404 if session not found |
| `get_messages(session_id)` | Gets all messages for a session, ordered by `created_at` ascending |

### Key pattern — conversion from ORM to Pydantic:

```python
async def list_sessions(self) -> SessionListResponse:
    records = await self.session_repo.get_all_with_messages()
    sessions = [
        SessionResponse(
            id=r.id,
            title=r.title,
            created_at=r.created_at,
            updated_at=r.updated_at,
            metadata={
                "model_id": r.model_id,
                "temperature": r.temperature,
                ...
            },
        )
        for r in records
    ]
    return SessionListResponse(sessions=sessions, total=len(sessions))
```

**Why the conversion?** The database model (`SessionRecord`) has columns like `model_id`, `temperature`, `max_tokens` as separate fields. The API response (`SessionResponse`) bundles them into a `metadata` dict. This decoupling means you can change the database schema without changing the API contract.

---

## File: `app/services/model_service.py`

**Purpose**: Manages the AI model registry.

```python
class ModelService:
    def __init__(self, session: AsyncSession) -> None:
        self.repo = ModelRepository(session)
```

### Methods:

| Method | What it does |
|--------|-------------|
| `list_models()` | Returns all models as `ModelListResponse` |
| `create_model(request)` | Creates a new model record |
| `update_model(model_id, request)` | Updates model fields (only non-None values) |
| `delete_model(model_id)` | Deletes a model record |

### Key conversion logic:
```python
models = [
    ModelMetadata(
        id=r.id,
        name=r.name,
        provider=r.provider,
        version="1.0",           # Hardcoded — not in DB
        capabilities=["chat"],   # Hardcoded — not in DB
        max_context_length=r.context_window,
        available=r.status == "Deployed",  # Computed from status
        type=r.type,
        ...
    )
    for r in records
]
```

**Note**: `version` and `capabilities` are hardcoded because the database schema doesn't have these columns. This is a known gap.

---

## File: `app/services/api_key_service.py`

**Purpose**: Generates, validates, and manages API keys for the OpenAI-compatible gateway.

### Key method — `generate_key()`:

```python
async def generate_key(self, name: str) -> dict:
    raw_key = f"om_{secrets.token_hex(32)}"     # Generate: "om_a1b2c3d4..."
    key_prefix = raw_key[:12]                    # Extract: "om_a1b2c3d4"
    key_hash = bcrypt.hashpw(                    # Hash the full key
        raw_key.encode(), bcrypt.gensalt()
    ).decode()
    
    record = await self.repo.create(
        name=name,
        key_hash=key_hash,       # Store ONLY the hash
        key_prefix=key_prefix,   # Store the prefix for fast lookup
    )
    
    return {
        "id": record.id,
        "name": record.name,
        "key": raw_key,          # Return raw key ONCE (never stored!)
        "key_prefix": key_prefix,
    }
```

**Security design**: 
1. Raw key is returned to the user exactly once (at creation).
2. Only the bcrypt hash and prefix are stored in the database.
3. To validate a key: query by prefix (fast), then compare bcrypt hash.

### Key method — `validate_key()`:

```python
async def validate_key(self, raw_key: str) -> bool:
    prefix = raw_key[:12]
    record = await self.repo.get_by_prefix(prefix)  # O(1) lookup
    if not record or not record.is_active:
        return False
    return bcrypt.checkpw(raw_key.encode(), record.key_hash.encode())
```

**O(1) validation**: Instead of fetching ALL keys and checking each hash (O(N) bcrypt comparisons), it uses the prefix to find the exact record, then does ONE bcrypt comparison.

---

## File: `app/services/monitoring_service.py`

**Purpose**: Collects real system metrics (CPU, RAM, database health).

```python
class MonitoringService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.settings = get_settings()
```

### `get_system_status()`:

```python
async def get_system_status(self) -> dict:
    # CPU and memory via psutil
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    
    # Database health check
    db_healthy = True
    try:
        if self.settings.DATABASE_URL.startswith("sqlite"):
            await self.session.execute(text("SELECT 1"))
        else:
            await self.session.execute(text("SELECT 1"))
    except Exception:
        db_healthy = False
    
    # Uptime calculation
    uptime_seconds = time.time() - process_start_time
    
    return {
        "health": "Healthy" if db_healthy else "Degraded",
        "cpuUsage": cpu_percent,
        "ramTotal": round(memory.total / (1024**3), 1),  # Convert to GB
        "ramUsed": round(memory.used / (1024**3), 1),
        "gpuUsage": 0,      # Not implemented
        "vramTotal": 0,      # Not implemented
        "vramUsed": 0,       # Not implemented
        ...
    }
```

**Note**: GPU/VRAM monitoring is not implemented — these always return 0. The frontend displays them, but they're always zero. Real GPU monitoring would require `pynvml` or similar.

---

## File: `app/services/domain_services.py`

**Purpose**: Contains six smaller services that are too simple to need their own files.

### Services in this file:

| Service | What it manages | Key methods |
|---------|----------------|-------------|
| `KnowledgeService` | Document upload and chunking | `list_sources()`, `create_source()`, `upload_file()`, `delete_source()` |
| `WorkflowService` | Workflow definitions and execution | `list_workflows()`, `create_workflow()`, `execute_workflow()` |
| `MemoryService` | Memory graph nodes and logs | `list_nodes()`, `create_node()`, `list_logs()`, `create_log()` |
| `LogService` | System logs and API request logs | `list_system_logs()`, `create_system_log()`, `list_api_logs()`, `clear_api_logs()` |
| `SettingsService` | Key-value settings | `get_all()`, `update_settings()` |
| `BenchmarkService` | Performance benchmark data | `list_benchmarks()` |

### Notable: `KnowledgeService.upload_file()`

This is the only service that handles file I/O:

```python
async def upload_file(self, file: UploadFile) -> dict:
    upload_dir = Path(self.settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / file.filename
    content = await file.read()
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Detect file type from extension
    ext = Path(file.filename).suffix.lower()
    
    # Extract text content
    if ext == ".pdf":
        import fitz  # PyMuPDF
        doc = fitz.open(str(file_path))
        text = "".join(page.get_text() for page in doc)
    elif ext in (".md", ".txt"):
        text = content.decode("utf-8", errors="ignore")
    else:
        text = content.decode("utf-8", errors="ignore")
    
    # Chunk the text (512 characters per chunk)
    chunk_size = 512
    chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
    
    # Create database record
    record = await self.repo.create(
        name=file.filename,
        type=ext.lstrip(".").upper(),
        size_bytes=len(content),
        chunks_count=len(chunks),
        file_path=str(file_path),
    )
    
    return {...}
```

**Key details**:
- Saves the file to disk in the `UPLOAD_DIR` directory.
- Uses PyMuPDF (`fitz`) to extract text from PDFs.
- Chunks the text into 512-character segments.
- Stores chunk count but NOT the actual chunks (no vector database integration yet).

### Notable: `WorkflowService.execute_workflow()`

```python
async def execute_workflow(self, workflow_id: str) -> dict:
    record = await self.workflow_repo.get_with_steps(workflow_id)
    if not record:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    results = []
    for step in sorted(record.steps, key=lambda s: s.order):
        result = {
            "step_id": step.id,
            "step_name": step.name,
            "type": step.type,
            "status": "completed",
            "output": f"Step '{step.name}' executed successfully (simulated)",
        }
        results.append(result)
    
    # Update last_run timestamp
    record.last_run = datetime.now(UTC).isoformat()
    await self.session.flush()
    
    return {"workflow_id": workflow_id, "status": "completed", "results": results}
```

**Important**: Workflow execution is **simulated**. Steps are not actually executed — no real LLM calls, API calls, or condition checks. This is placeholder logic.

---

## Service-to-Repository Mapping

| Service | Repository/Repositories Used |
|---------|------------------------------|
| `ChatService` | `MessageRepository` |
| `SessionService` | `SessionRepository`, `MessageRepository` |
| `ModelService` | `ModelRepository` |
| `ApiKeyService` | `ApiKeyRepository` |
| `MonitoringService` | None (uses raw session for `SELECT 1`) |
| `KnowledgeService` | `KnowledgeRepository` |
| `WorkflowService` | `WorkflowRepository`, `WorkflowStepRepository` |
| `MemoryService` | `MemoryNodeRepository`, `MemoryConnectionRepository`, `MemoryLogRepository` |
| `LogService` | `LogEntryRepository`, `RequestLogRepository` |
| `SettingsService` | `SettingsRepository` |
| `BenchmarkService` | `BenchmarkRepository` |
