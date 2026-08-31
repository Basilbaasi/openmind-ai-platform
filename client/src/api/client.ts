/**
 * API Client for OpenMind AI Platform.
 * 
 * All requests are routed through the Vite dev proxy
 * to the FastAPI backend on port 8000.
 */

const BASE_URL = '';  // Relative — Vite proxy handles routing

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.message || error.detail || `HTTP ${response.status}`);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ── Models ──────────────────────────────────────────────────────

export const modelsApi = {
  list: () => request<{ models: any[]; total: number }>('/models'),
  create: (data: any) => request<any>('/models', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/models/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/models/${id}`, { method: 'DELETE' }),
  testAdapter: (data: any) => request<any>('/models/test-adapter', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Sessions ────────────────────────────────────────────────────

export const sessionsApi = {
  list: () => request<{ sessions: any[]; total: number }>('/sessions'),
  create: (data: any) => request<any>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => request<any>(`/sessions/${id}`),
  update: (id: string, data: any) => request<any>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/sessions/${id}`, { method: 'DELETE' }),
  getMessages: (id: string) => request<any[]>(`/sessions/${id}/messages`),
  addMessage: (id: string, data: any) => request<any>(`/sessions/${id}/messages`, { method: 'POST', body: JSON.stringify(data) }),
};

// ── Chat ────────────────────────────────────────────────────────

export const chatApi = {
  send: (data: any) => request<any>('/chat', { method: 'POST', body: JSON.stringify(data) }),

  stream: (data: any): EventSource | null => {
    // For SSE streaming, we use fetch with ReadableStream
    return null;  // See streamChat() below
  },
};

/**
 * Stream a chat response via SSE.
 * Yields text chunks as they arrive.
 */
export async function* streamChat(data: any): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.message || error.detail || `Stream failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.chunk) {
            yield parsed.chunk;
          }
        } catch {
          // Skip malformed lines
        }
      }
    }
  }
}

// ── Knowledge ───────────────────────────────────────────────────

export const knowledgeApi = {
  list: () => request<any[]>('/knowledge'),
  create: (data: any) => request<any>('/knowledge', { method: 'POST', body: JSON.stringify(data) }),
  upload: async (file: File, embeddingModel: string = ''): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const params = embeddingModel ? `?embedding_model=${encodeURIComponent(embeddingModel)}` : '';
    const response = await fetch(`${BASE_URL}/knowledge/upload${params}`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  },
  getChunks: (sourceId: string) => request<any[]>(`/knowledge/${sourceId}/chunks`),
  search: (query: string, limit: number = 10) =>
    request<any[]>(`/knowledge/search?q=${encodeURIComponent(query)}&limit=${limit}`),
  delete: (id: string) => request<void>(`/knowledge/${id}`, { method: 'DELETE' }),
};

// ── Workflows ───────────────────────────────────────────────────

export const workflowsApi = {
  list: () => request<any[]>('/workflows'),
  get: (id: string) => request<any>(`/workflows/${id}`),
  create: (data: any) => request<any>('/workflows', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/workflows/${id}`, { method: 'DELETE' }),
  execute: (id: string) => request<any>(`/workflows/${id}/execute`, { method: 'POST' }),
};

// ── Memory ──────────────────────────────────────────────────────

export const memoryApi = {
  listNodes: () => request<any[]>('/memory/nodes'),
  createNode: (data: any) => request<any>('/memory/nodes', { method: 'POST', body: JSON.stringify(data) }),
  listLogs: () => request<any[]>('/memory/logs'),
  createLog: (data: any) => request<any>('/memory/logs', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Monitoring ──────────────────────────────────────────────────

export const monitoringApi = {
  getStatus: () => request<any>('/api/status'),
};

// ── Settings ────────────────────────────────────────────────────

export const settingsApi = {
  get: () => request<Record<string, string>>('/settings'),
  update: (data: any) => request<Record<string, string>>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

// ── API Keys ────────────────────────────────────────────────────

export const apiKeysApi = {
  list: () => request<any[]>('/api-keys'),
  create: (name: string) => request<any>('/api-keys', { method: 'POST', body: JSON.stringify({ name }) }),
  delete: (id: string) => request<void>(`/api-keys/${id}`, { method: 'DELETE' }),
};

// ── Logs ────────────────────────────────────────────────────────

export const logsApi = {
  system: () => request<any[]>('/logs/system'),
  createSystemLog: (data: any) => request<any>('/logs/system', { method: 'POST', body: JSON.stringify(data) }),
  api: () => request<any[]>('/logs/api'),
  clearApi: () => request<void>('/logs/api', { method: 'DELETE' }),
};

// ── Benchmarks ──────────────────────────────────────────────────

export const benchmarksApi = {
  list: () => request<any[]>('/benchmarks'),
};
