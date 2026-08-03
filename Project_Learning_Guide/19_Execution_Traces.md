# 19 — Execution Traces

Step-by-step runtime traces for every major feature. Each trace shows exactly what code runs, in what order, across which files.

---

## Trace 1: User Opens the App for the First Time

```
1. User navigates to http://localhost:3000
2. Vite serves client/index.html → browser loads main.tsx
3. React renders <App />
4. App.tsx useEffect runs loadBackendData():

   ┌─ Frontend (App.tsx) ─────────────────────────────────┐
   │ 5. sessionsApi.list()                                 │
   │    → fetch("GET /sessions")                           │
   │    → Vite proxy → http://localhost:8000/sessions      │
   └───────────────────────────────────────────────────────┘
   
   ┌─ Backend ────────────────────────────────────────────┐
   │ 6. sessions.py → list_sessions()                     │
   │ 7. Depends(get_db) → creates AsyncSession            │
   │ 8. SessionService(session).list_sessions()            │
   │ 9. SessionRepository.get_all_with_messages()          │
   │    → SELECT * FROM sessions (with selectinload)       │
   │    → SELECT * FROM messages WHERE session_id IN (...) │
   │ 10. Converts SessionRecord[] → SessionListResponse    │
   │ 11. session.commit() (nothing to commit)              │
   └───────────────────────────────────────────────────────┘
   
   ┌─ Frontend (App.tsx) ─────────────────────────────────┐
   │ 12. Normalizes snake_case → camelCase                 │
   │ 13. setSessions(normalized)                           │
   │ 14. React re-renders with real data                   │
   │                                                       │
   │ 15. Repeats for: models, knowledge, workflows,       │
   │     memory, benchmarks, logs, settings, status        │
   └───────────────────────────────────────────────────────┘

16. Dashboard renders with all loaded data
```

---

## Trace 2: User Sends a Chat Message (Streaming)

```
1. User types "Hello AI" in Playground, clicks Send

   ┌─ Frontend (Playground.tsx) ──────────────────────────┐
   │ 2. Creates user message object, adds to UI state     │
   │ 3. Calls streamChat({                                │
   │       messages: [{role: "user", content: "Hello AI"}]│
   │       model: "gemini-2.0-flash",                     │
   │       session_id: "abc-123"                          │
   │    })                                                 │
   │ 4. fetch("POST /chat/stream") with JSON body         │
   │    → Vite proxy → localhost:8000/chat/stream          │
   └───────────────────────────────────────────────────────┘

   ┌─ Backend (chat.py route) ────────────────────────────┐
   │ 5. FastAPI parses body → ChatRequest (Pydantic)      │
   │ 6. Depends(get_db) → AsyncSession created            │
   │ 7. ChatService(session) constructed                   │
   │    └─ MessageRepository(session) created inside       │
   │ 8. StreamingResponse(                                 │
   │       service.stream_response(request),               │
   │       media_type="text/event-stream"                  │
   │    )                                                  │
   └───────────────────────────────────────────────────────┘

   ┌─ Backend (ChatService.stream_response) ──────────────┐
   │ 9. response_id = "chatcmpl-a1b2c3d4e5f6"            │
   │ 10. session_id exists → save user message:           │
   │     MessageRepository.create(                         │
   │         session_id="abc-123", role="user",            │
   │         content="Hello AI"                            │
   │     )                                                 │
   │     → INSERT INTO messages (...) VALUES (...)         │
   │     → session.flush() (not committed yet)             │
   │                                                       │
   │ 11. Check GEMINI_API_KEY:                            │
   │     ├─ IF SET: genai.configure(api_key=...)          │
   │     │   model = GenerativeModel("gemini-2.0-flash")   │
   │     │   response = model.generate_content_async(      │
   │     │       "user: Hello AI", stream=True             │
   │     │   )                                             │
   │     │   for chunk in response:                        │
   │     │       yield f"data: {json}\n\n"                 │
   │     │                                                 │
   │     └─ IF EMPTY: Mock text split into words          │
   │         for word in mock_text.split():                │
   │             await asyncio.sleep(0.05)                 │
   │             yield f"data: {json}\n\n"                 │
   │                                                       │
   │ 12. After all chunks: save assistant message:         │
   │     MessageRepository.create(                         │
   │         session_id="abc-123", role="assistant",       │
   │         content="Hello! How can I help you?"          │
   │     )                                                 │
   │     → INSERT INTO messages (...) VALUES (...)         │
   │                                                       │
   │ 13. yield "data: [DONE]\n\n"                         │
   └───────────────────────────────────────────────────────┘

   ┌─ Wire (SSE over HTTP) ──────────────────────────────┐
   │ data: {"id":"chatcmpl-...","chunk":"Hello","..."}    │
   │                                                       │
   │ data: {"id":"chatcmpl-...","chunk":"!","..."}        │
   │                                                       │
   │ data: {"id":"chatcmpl-...","chunk":" How","..."}     │
   │                                                       │
   │ data: [DONE]                                          │
   └───────────────────────────────────────────────────────┘

   ┌─ Frontend (client.ts streamChat) ───────────────────┐
   │ 14. reader.read() → receives bytes                   │
   │ 15. decoder.decode(value) → converts to text         │
   │ 16. Splits by \n, parses "data: {...}"               │
   │ 17. JSON.parse → extracts chunk text                 │
   │ 18. yield chunk → Playground receives it             │
   └───────────────────────────────────────────────────────┘

   ┌─ Frontend (Playground.tsx) ──────────────────────────┐
   │ 19. for await (const chunk of streamChat(...)):      │
   │     setAssistantMessage(prev => prev + chunk)        │
   │ 20. UI updates token-by-token in real-time           │
   │ 21. Stream ends → message added to session state     │
   └───────────────────────────────────────────────────────┘

   ┌─ Backend (get_db cleanup) ──────────────────────────┐
   │ 22. Generator exhausted → StreamingResponse done     │
   │ 23. get_db() resumes after yield                     │
   │ 24. await session.commit()                            │
   │     → Both messages (user + assistant) committed     │
   │ 25. Session returned to pool                         │
   └───────────────────────────────────────────────────────┘
```

---

## Trace 3: External App Calls OpenAI Gateway

```
1. External app sends:
   POST /api/v1/chat/completions
   Authorization: Bearer om_a1b2c3d4e5f6g7h8...
   {"messages": [{"role": "user", "content": "Hi"}], "model": "gpt-4"}

   ┌─ Backend (gateway.py) ──────────────────────────────┐
   │ 2. Depends(validate_bearer_token):                   │
   │    a. Extract "om_a1b2c3d4e5f6g7h8..." from header  │
   │    b. prefix = raw_key[:12] = "om_a1b2c3d4"         │
   │    c. ApiKeyRepository.get_by_prefix("om_a1b2c3d4") │
   │       → SELECT * FROM api_keys WHERE key_prefix=... │
   │    d. bcrypt.checkpw(raw_key, record.key_hash)       │
   │    e. If invalid → HTTP 401 Unauthorized             │
   │    f. If valid → continue                            │
   │                                                       │
   │ 3. start_time = time.time()                          │
   │ 4. body = await request.json()                       │
   │ 5. Convert OpenAI format → ChatRequest               │
   │ 6. ChatService(session).generate_response(request)   │
   │    (Same as POST /chat — see Trace 2 without stream) │
   │                                                       │
   │ 7. Convert ChatResponse → OpenAI format:             │
   │    {"choices": [{"message": {...}}], "usage": {...}}  │
   │                                                       │
   │ 8. Log the request:                                   │
   │    RequestLogRepository.create(                       │
   │        method="POST",                                 │
   │        url="/api/v1/chat/completions",                │
   │        status=200,                                    │
   │        time_ms=elapsed_ms                             │
   │    )                                                  │
   │                                                       │
   │ 9. Return OpenAI-compatible JSON response            │
   └───────────────────────────────────────────────────────┘
```

---

## Trace 4: Uploading a PDF Document

```
1. User clicks "Upload" in Knowledge view, selects "report.pdf"

   ┌─ Frontend (Knowledge.tsx) ──────────────────────────┐
   │ 2. knowledgeApi.upload(file)                         │
   │ 3. Creates FormData, appends file                    │
   │ 4. fetch("POST /knowledge/upload", {body: formData}) │
   └───────────────────────────────────────────────────────┘

   ┌─ Backend (knowledge.py route) ──────────────────────┐
   │ 5. async def upload_knowledge(file: UploadFile, ...) │
   │ 6. KnowledgeService(session).upload_file(file)       │
   └───────────────────────────────────────────────────────┘

   ┌─ Backend (KnowledgeService.upload_file) ────────────┐
   │ 7. Create uploads/ directory if not exists            │
   │ 8. Read file bytes: content = await file.read()      │
   │ 9. Save to disk: uploads/report.pdf                  │
   │                                                       │
   │ 10. Detect file type from extension: ".pdf"          │
   │ 11. Extract text using PyMuPDF:                      │
   │     doc = fitz.open("uploads/report.pdf")            │
   │     text = "".join(page.get_text() for page in doc)  │
   │                                                       │
   │ 12. Chunk text into 512-char segments:               │
   │     chunks = [text[i:i+512] for i in range(0,len,512)]│
   │                                                       │
   │ 13. Save to database:                                │
   │     KnowledgeRepository.create(                       │
   │         name="report.pdf",                            │
   │         type="PDF",                                   │
   │         size_bytes=len(content),                      │
   │         chunks_count=len(chunks),                     │
   │         file_path="uploads/report.pdf"                │
   │     )                                                 │
   │     → INSERT INTO knowledge_sources (...)             │
   │                                                       │
   │ 14. NOTE: Actual chunks are DISCARDED                │
   │     (Only count is saved, not the chunk contents)     │
   └───────────────────────────────────────────────────────┘
```

---

## Trace 5: Creating an API Key

```
1. User clicks "Generate New Key" in Settings

   ┌─ Backend (ApiKeyService.generate_key) ──────────────┐
   │ 2. raw_key = "om_" + secrets.token_hex(32)           │
   │    Example: "om_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7" │
   │                                                       │
   │ 3. key_prefix = raw_key[:12]                         │
   │    Example: "om_a1b2c3d4"                            │
   │                                                       │
   │ 4. key_hash = bcrypt.hashpw(raw_key, bcrypt.gensalt())│
   │    Example: "$2b$12$LJ3m5..."                        │
   │                                                       │
   │ 5. ApiKeyRepository.create(                           │
   │        name="My API Key",                             │
   │        key_hash="$2b$12$LJ3m5...",  # Stored         │
   │        key_prefix="om_a1b2c3d4"     # Stored         │
   │    )                                                  │
   │                                                       │
   │ 6. Return to user:                                   │
   │    {                                                  │
   │      "id": "uuid-...",                                │
   │      "name": "My API Key",                            │
   │      "key": "om_a1b2c3d4e5f6..."  ← ONLY TIME shown │
   │      "key_prefix": "om_a1b2c3d4"                     │
   │    }                                                  │
   └───────────────────────────────────────────────────────┘

   The raw key is shown ONCE and never stored.
   If the user loses it, they must generate a new one.
```

---

## Trace 6: Database Seed Script

```
$ python -m app.core.seed

   ┌─ seed.py ───────────────────────────────────────────┐
   │ 1. asyncio.run(run_seed())                           │
   │                                                       │
   │ 2. Create all tables:                                │
   │    async with engine.begin() as conn:                │
   │        conn.run_sync(Base.metadata.create_all)       │
   │    → CREATE TABLE IF NOT EXISTS models (...)         │
   │    → CREATE TABLE IF NOT EXISTS sessions (...)       │
   │    → ... (11 tables)                                 │
   │                                                       │
   │ 3. Open session:                                     │
   │    async with async_session_factory() as session:     │
   │                                                       │
   │ 4. seed_models(session):                             │
   │    → session.merge(ModelRecord(id="llama3-8b-...",)) │
   │    → session.merge(ModelRecord(id="mistral-7b",))    │
   │    → ... (7 models)                                  │
   │    merge = INSERT if new, UPDATE if exists            │
   │                                                       │
   │ 5. seed_sessions(session):                           │
   │    → 2 demo sessions + messages                      │
   │                                                       │
   │ 6-13. Seed knowledge, workflows, memory, benchmarks, │
   │       logs, settings                                  │
   │                                                       │
   │ 14. await session.commit()                           │
   │     → ALL inserts/updates committed atomically       │
   └───────────────────────────────────────────────────────┘
```

---

## Trace 7: Error Path — Invalid Request

```
1. Client sends POST /chat with {"model": "test"}  (missing "messages")

   ┌─ Backend ───────────────────────────────────────────┐
   │ 2. FastAPI tries to parse body as ChatRequest        │
   │ 3. Pydantic validation fails:                        │
   │    "messages" field is required (Field(...))          │
   │ 4. FastAPI raises RequestValidationError              │
   │                                                       │
   │ 5. validation_exception_handler catches it:          │
   │    a. Extracts error details from exc.errors()       │
   │    b. Builds ErrorDetail(                             │
   │           loc=["body", "messages"],                   │
   │           msg="Field required",                       │
   │           type="missing"                              │
   │       )                                               │
   │    c. Returns JSONResponse(                           │
   │           status_code=422,                            │
   │           content=APIError(                           │
   │               error_type="validation_error",          │
   │               message="Request validation failed",    │
   │               details=[...]                           │
   │           )                                           │
   │       )                                               │
   │                                                       │
   │ 6. NOTE: get_db() was NEVER called                   │
   │    (Pydantic validation happens BEFORE dependencies)  │
   │    So no database session was created or committed    │
   └───────────────────────────────────────────────────────┘
```
