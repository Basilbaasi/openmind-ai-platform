# 04 — Frontend Flow

How the React frontend works, loads data, and communicates with the backend.

---

## Entry Point Chain

```
client/index.html
    → <script src="/src/main.tsx">
        → main.tsx imports App from './App.tsx'
        → main.tsx imports './index.css'
        → createRoot(#root).render(<StrictMode><App /></StrictMode>)
```

### `index.html` (14 lines)
- Standard HTML5 boilerplate with `<div id="root">`.
- Vite processes the `<script type="module">` tag to bundle the app.
- **Note**: Title says "My Google AI Studio App" — should be "OpenMind AI Platform".

### `main.tsx` (11 lines)
- Imports React, ReactDOM, App, and global CSS.
- `StrictMode`: Enables extra development checks (double-renders to catch bugs).
- `createRoot()`: React 19's new rendering API (replaces `ReactDOM.render()`).

### `index.css` (26 lines)
- Imports Google Fonts: Inter (UI text), Lora (serif), JetBrains Mono (code).
- Imports TailwindCSS v4 via `@import "tailwindcss"`.
- Custom scrollbar styling (thin, transparent).

---

## App.tsx — The State Controller

`App.tsx` is the **single source of truth** for the entire frontend. It manages ALL application state, renders the sidebar navigation, and renders the current view.

### No Router Library
There is NO React Router. Navigation is handled by a simple `currentView` state:

```typescript
const [currentView, setCurrentView] = useState<string>('dashboard');
```

The sidebar renders buttons that call `setCurrentView('playground')`, etc. The main content area renders the appropriate component based on `currentView`.

### State Variables

`App.tsx` manages approximately 12 state variables:

| State | Type | Purpose |
|-------|------|---------|
| `currentView` | `string` | Which page to show ("dashboard", "playground", etc.) |
| `models` | `Model[]` | AI model registry data |
| `sessions` | `PlaygroundSession[]` | Chat sessions with messages |
| `activeSessionId` | `string` | Currently selected session |
| `knowledgeSources` | `IngestedSource[]` | Uploaded documents |
| `workflows` | `Workflow[]` | Workflow definitions |
| `memoryNodes` | `MemoryNode[]` | Memory graph nodes |
| `memoryLogs` | `MemoryLog[]` | Memory operation logs |
| `benchmarks` | `BenchmarkResult[]` | Performance data |
| `logEntries` | `LogEntry[]` | System logs |
| `apiLogs` | `ApiRequestLog[]` | API request logs |
| `systemSettings` | `SystemSettings` | Platform configuration |
| `systemStatus` | `SystemStatus` | CPU, RAM, health metrics |

### Data Loading on Mount

When `App.tsx` first renders, a `useEffect` hook loads data from the backend:

```typescript
useEffect(() => {
    async function loadBackendData() {
        try {
            // Load sessions from API
            const sRes = await sessionsApi.list();
            if (sRes && Array.isArray(sRes.sessions)) {
                const normalized = await Promise.all(
                    sRes.sessions.map(async (s) => {
                        // ... normalize each session
                    })
                );
                setSessions(normalized);
            }
        } catch (e) {
            console.log("Backend sessions load fallback to local", e);
            // Falls back to data from data.ts
        }
        
        // Similar loading for models, knowledge, workflows, etc.
    }
    loadBackendData();
}, []);
```

**Key behavior**:
- If the backend is available → loads real data.
- If the backend is down → catches the error and uses fallback data from `data.ts`.
- This makes the frontend work even without a running backend (with mock data).

### Data Normalization

The backend returns data in `snake_case` (Python convention), but the frontend uses `camelCase` (JavaScript convention). `App.tsx` normalizes the data during loading:

```typescript
const normalized = {
    id: s.id,
    title: s.title || "Untitled Session",
    modelId: s.modelId || s.model_id || meta.model_id || "default",
    temperature: s.temperature ?? meta.temperature ?? 0.7,
    maxTokens: s.maxTokens ?? s.max_tokens ?? meta.max_tokens ?? 1024,
    // ...
};
```

The `??` (nullish coalescing) and `||` operators provide multiple fallbacks to handle different data shapes from the API.

### Props Passing

All state and state-setter functions are passed down to child components as props:

```typescript
{currentView === 'playground' && (
    <Playground
        sessions={sessions}
        setSessions={setSessions}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
        models={models}
    />
)}
```

---

## client/src/api/client.ts — The API Client

**Purpose**: Centralizes all HTTP communication with the backend.

### Base Architecture

```typescript
const BASE_URL = '';  // Empty string = relative URLs
```

URLs are relative (e.g., `/models`, `/chat`), which means they go to `localhost:3000` (the Vite dev server). Vite then proxies them to `localhost:8000` (the FastAPI backend).

### Generic Request Function

```typescript
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${BASE_URL}${url}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }
    
    if (response.status === 204) return undefined as T;  // No Content
    return response.json();
}
```

- Every API call goes through this function.
- Sets `Content-Type: application/json` by default.
- Handles errors: parses the error body and throws a JavaScript `Error`.
- Handles 204 No Content: returns `undefined` instead of trying to parse empty body.

### API Modules

Each domain has its own API object:

```typescript
export const modelsApi = {
    list: () => request('/models'),
    create: (data) => request('/models', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/models/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/models/${id}`, { method: 'DELETE' }),
};
```

### SSE Streaming (`streamChat`)

The most complex function — an async generator that processes Server-Sent Events:

```typescript
export async function* streamChat(data: any): AsyncGenerator<string, void, unknown> {
    const response = await fetch('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';  // Keep incomplete line in buffer
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') return;
                const parsed = JSON.parse(data);
                if (parsed.chunk) yield parsed.chunk;
            }
        }
    }
}
```

**How it works**:
1. Sends POST request to `/chat/stream`
2. Gets a `ReadableStream` from the response body
3. Reads chunks of bytes as they arrive (server is still streaming)
4. Decodes bytes to text, splits by newlines
5. Parses SSE format: lines starting with `data: ` contain JSON
6. `yield`s each text chunk to the caller
7. Stops when it sees `data: [DONE]`

**Usage in Playground**:
```typescript
for await (const chunk of streamChat(chatData)) {
    setCurrentMessage(prev => prev + chunk);  // Append to displayed text
}
```

---

## client/src/types.ts — TypeScript Interfaces

Defines the shape of every data object in the frontend. Key interfaces:

| Interface | Backend equivalent |
|-----------|-------------------|
| `SystemStatus` | `MonitoringService.get_system_status()` response |
| `Model` | `ModelMetadata` schema |
| `Message` | `MessageRecord` model |
| `PlaygroundSession` | `SessionRecord` + messages |
| `ApiRequestLog` | `RequestLogRecord` model |
| `MemoryNode` | `MemoryNodeRecord` model |
| `IngestedSource` | `KnowledgeSourceRecord` model |
| `Workflow` | `WorkflowRecord` + steps |
| `BenchmarkResult` | `BenchmarkRecord` model |
| `LogEntry` | `LogEntryRecord` model |
| `ApiKey` | `ApiKeyRecord` model |
| `SystemSettings` | `SettingsService` aggregated response |

---

## Component Overview

All 11 components live in `client/src/components/`. Each is a React functional component that receives props from `App.tsx`.

| Component | Purpose | Key API calls |
|-----------|---------|---------------|
| `Dashboard.tsx` | Overview: metrics, model count, activity feed | `monitoringApi.getStatus()` |
| `Playground.tsx` | Multi-session chat with streaming | `streamChat()`, `sessionsApi.*` |
| `ApiExplorer.tsx` | Postman-like API tester | `logsApi.api()`, `logsApi.clearApi()` |
| `Models.tsx` | Model registry table with CRUD | `modelsApi.*` |
| `Sessions.tsx` | Session list with delete | `sessionsApi.*` |
| `Memory.tsx` | Memory node graph visualizer | `memoryApi.*` |
| `Knowledge.tsx` | Document upload and chunk viewer | `knowledgeApi.*` |
| `Orchestrator.tsx` | Workflow builder and executor | `workflowsApi.*` |
| `Benchmarks.tsx` | Model performance comparison | `benchmarksApi.list()` |
| `Logs.tsx` | System event log viewer | `logsApi.system()` |
| `Settings.tsx` | Platform config and theme switcher | `settingsApi.*`, `apiKeysApi.*` |

---

## Vite Proxy Configuration

```typescript
// vite.config.ts
server: {
    port: 3000,
    proxy: {
        '/chat': 'http://localhost:8000',
        '/sessions': 'http://localhost:8000',
        '/models': 'http://localhost:8000',
        // ... 10 more proxy rules
    },
}
```

**Why proxying?** Without it, the browser would block requests from `localhost:3000` to `localhost:8000` due to CORS (Cross-Origin Resource Sharing). The proxy makes it look like the API is served from the same origin.

Every URL that starts with `/chat`, `/sessions`, `/models`, etc. is intercepted by Vite and forwarded to the FastAPI backend. The browser thinks everything comes from `localhost:3000`.
