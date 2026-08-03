# 15 — Frontend Components

Every component in `client/src/components/` explained.

---

## Component Architecture

All 11 components follow the same pattern:
1. Receive state as **props** from `App.tsx`
2. Render UI using that state
3. Call API methods from `client.ts` for user actions
4. Update state via setter functions (also received as props)

There is **no Redux, Zustand, or Context API** — state management is pure `useState` in `App.tsx`, passed down as props.

---

## Dashboard.tsx

**Purpose**: System overview — metrics, model status, activity feed.

**Key features**:
- Displays CPU usage, RAM usage, VRAM usage, uptime
- Shows active model count, ingested sources count, workflow count
- Renders recent activity (log entries)
- Calls `monitoringApi.getStatus()` on mount or refresh

**Notable**: VRAM display always shows zero (backend doesn't report GPU data — see Known Issues #1).

---

## Playground.tsx

**Purpose**: The multi-session AI chat interface. The most complex component.

**Key features**:
- Session sidebar: list all sessions, create new, switch between them
- Chat message display: renders user and assistant messages
- Message input with send button
- Settings panel: model selection, temperature slider, max_tokens, top_p, system prompt, JSON mode
- **Real-time streaming**: Uses `streamChat()` async generator

**Streaming flow**:
```typescript
const handleSend = async () => {
    // 1. Add user message to local state
    // 2. Call streamChat() with all messages + settings
    // 3. For each chunk received:
    //    - Append chunk text to assistant message in state
    //    - UI updates in real-time
    // 4. Stream ends → finalize message
};
```

**Session management**:
- `createSession()` → `POST /sessions` → adds to local state
- `deleteSession()` → `DELETE /sessions/{id}` → removes from local state
- Session switch → loads messages from session state (already cached from initial load)

---

## ApiExplorer.tsx

**Purpose**: A Postman-like API testing tool built into the dashboard.

**Key features**:
- Method selector (GET, POST, PUT, DELETE)
- URL input field
- Request headers editor
- Request body editor (JSON)
- Send button
- Response viewer (status, headers, body)
- Request history log (from `request_logs` table)
- Clear history button

**How it works**: Makes raw `fetch()` calls to whatever URL the user types, then displays the response. The request/response is also logged to the `request_logs` table by the gateway.

---

## Models.tsx

**Purpose**: AI model registry management.

**Key features**:
- Table of all registered models (name, provider, type, status, context window)
- Add new model form
- Edit model (inline or modal)
- Delete model (with confirmation)
- Status badges (Deployed = green, Offline = red, Syncing = yellow)

**CRUD operations**:
```typescript
// Create
await modelsApi.create({ name, provider, type, ... })

// Update
await modelsApi.update(id, { name: "New Name", ... })

// Delete
await modelsApi.delete(id)

// After each operation: reload models list
```

---

## Sessions.tsx

**Purpose**: Session list management (separate from the Playground's sidebar).

**Key features**:
- Table of all sessions with title, model, creation date
- Delete session button
- Click to view session details
- Message count per session

---

## Memory.tsx

**Purpose**: Graph memory visualizer.

**Key features**:
- Displays memory nodes grouped by tier (Conversation, Semantic, Long-Term)
- Create new memory node form (label, tier, category, value)
- Memory log viewer (operations like Read, Write, Prune, Consolidate)

**Note**: There's no visual graph rendering (no D3.js or similar). Nodes are displayed as a list/table, not as a connected graph visualization.

---

## Knowledge.tsx

**Purpose**: Document upload and management.

**Key features**:
- List of uploaded documents (name, type, size, chunks, status)
- File upload dropzone (PDF, MD, TXT)
- Delete document
- Progress indicator during upload

**Upload flow**:
```typescript
const handleUpload = async (file: File) => {
    const result = await knowledgeApi.upload(file);
    // Add to local state
};
```

---

## Orchestrator.tsx

**Purpose**: Workflow builder and executor.

**Key features**:
- List of workflows with status and step count
- Create new workflow form
- Add steps to workflow (type: LLM, Condition, API Call, Memory Fetch, Human Approval)
- Execute workflow button
- Execution results display

**Note**: Workflow execution is simulated on the backend — steps aren't actually run.

---

## Benchmarks.tsx

**Purpose**: Performance comparison table.

**Key features**:
- Table comparing models on: TTFT (ms), TPS, latency (ms), accuracy (%), VRAM (GB), cost per 1K tokens
- All data comes from the `benchmarks` database table (seeded with demo data)
- Sortable/filterable columns

---

## Logs.tsx

**Purpose**: System event log viewer.

**Key features**:
- System logs tab: log entries with severity (INFO, WARN, ERROR), source, message, timestamp
- Severity filtering (show only errors, etc.)
- Refresh button to reload logs

---

## Settings.tsx

**Purpose**: Platform configuration and theming.

**Key features**:
- Platform name, description, system prompt
- Max session timeout, max tokens
- Theme selector (Sophisticated Dark, Slate Dark, Cyberpunk Light, etc.)
- API key management section:
  - List existing API keys (shows prefix only)
  - Generate new API key (shows full key ONCE)
  - Delete API key

**Settings save flow**:
```typescript
const handleSave = async () => {
    await settingsApi.update({
        platform_name: name,
        default_model: model,
        theme: selectedTheme,
        // ... all settings as key-value pairs
    });
};
```

---

## Shared UI Patterns Across Components

### Loading States
Most components show a loading spinner or skeleton while fetching data.

### Error Handling
API errors are caught and displayed as toast notifications or inline error messages.

### Refresh Pattern
Many components have a refresh button that re-fetches data from the API:
```typescript
const handleRefresh = async () => {
    const data = await someApi.list();
    setLocalState(data);
};
```

### Form Pattern
Create/edit forms follow this pattern:
1. Local state for form fields (`useState`)
2. Submit handler validates and calls API
3. On success → update parent state via prop setter
4. On error → display error message

---

## Component Size Summary

| Component | Approximate Size | Complexity |
|-----------|-----------------|------------|
| `Dashboard.tsx` | Medium (~400 lines) | Medium — metrics display |
| `Playground.tsx` | Large (~800+ lines) | High — streaming, sessions, settings |
| `ApiExplorer.tsx` | Large (~600 lines) | High — request builder |
| `Models.tsx` | Medium (~400 lines) | Medium — CRUD table |
| `Sessions.tsx` | Small (~200 lines) | Low — simple list |
| `Memory.tsx` | Medium (~350 lines) | Medium — nodes + logs |
| `Knowledge.tsx` | Medium (~350 lines) | Medium — file upload |
| `Orchestrator.tsx` | Large (~600 lines) | High — workflow builder |
| `Benchmarks.tsx` | Small (~250 lines) | Low — data table |
| `Logs.tsx` | Small (~250 lines) | Low — log viewer |
| `Settings.tsx` | Medium (~500 lines) | Medium — forms + API keys |
