import {
  SystemStatus,
  Model,
  PlaygroundSession,
  ApiRequestLog,
  MemoryNode,
  MemoryLog,
  IngestedSource,
  Workflow,
  BenchmarkResult,
  LogEntry,
  SystemSettings
} from "./types";

export const initialSystemStatus: SystemStatus = {
  health: "Healthy",
  uptime: "14d 6h 32m",
  version: "v0.2.0-beta",
  cpuUsage: 14.8,
  gpuUsage: 64.2,
  vramTotal: 24,
  vramUsed: 15.4,
  ramTotal: 64,
  ramUsed: 22.8
};

export const initialModels: Model[] = [
  {
    id: "llama3-8b-instruct",
    name: "Llama 3 8B Instruct",
    provider: "Local",
    type: "text",
    contextWindow: 8192,
    parameters: "8B",
    latencyMs: 35,
    vramRequiredGb: 6.5,
    rpmLimit: 1200,
    status: "Deployed",
    description: "Meta's highly capable 8B parameter instruction-tuned model, optimized for local execution with extremely low latency."
  },
  {
    id: "deepseek-r1-7b",
    name: "DeepSeek R1 7B",
    provider: "Local",
    type: "text",
    contextWindow: 16384,
    parameters: "7B",
    latencyMs: 95,
    vramRequiredGb: 5.8,
    rpmLimit: 800,
    status: "Deployed",
    description: "State-of-the-art reasoning model optimized for math, logic, and multi-step complex code generation."
  },
  {
    id: "nvidia-ising-1.5-31b",
    name: "NVIDIA Ising Calibration 1.5 31B",
    provider: "Cloud",
    type: "text",
    contextWindow: 32768,
    parameters: "31B",
    latencyMs: 85,
    vramRequiredGb: 0,
    rpmLimit: 1000,
    status: "Deployed",
    description: "NVIDIA's Ising Calibration 1.5 31B model via NVIDIA API. Pre-configured adapter code with standardized variable naming.",
    adapterCode: `import requests\n\ninvoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"\n\nheaders = {\n    "Authorization": f"Bearer {api_key}",\n    "Accept": "application/json",\n}\n\npayload = {\n    "model": "nvidia/ising-calibration-1.5-31b",\n    "messages": messages,\n    "max_tokens": max_tokens,\n    "temperature": temperature,\n    "top_p": top_p,\n    "stream": False,\n}\n\nresp = requests.post(invoke_url, headers=headers, json=payload)\ndata = resp.json()\n\nif "choices" in data and len(data["choices"]) > 0:\n    response_text = data["choices"][0]["message"]["content"]\nelif "error" in data:\n    response_text = f"API Error: {data['error'].get('message', str(data['error']))}"\nelse:\n    response_text = f"Unexpected response format: {json.dumps(data)}"`
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "Cloud",
    type: "text",
    contextWindow: 128000,
    parameters: "Proprietary",
    latencyMs: 120,
    vramRequiredGb: 0,
    rpmLimit: 1000,
    status: "Deployed",
    description: "OpenAI's flagship high-intelligence multimodal model, balancing latency, speed, and analytical precision."
  },
  {
    id: "clip-vit-l14",
    name: "CLIP ViT-L/14",
    provider: "Local",
    type: "vision",
    contextWindow: 77,
    parameters: "400M",
    latencyMs: 12,
    vramRequiredGb: 1.8,
    rpmLimit: 5000,
    status: "Deployed",
    description: "Contrastive Language-Image Pre-training model used for semantic image understanding, zero-shot classification, and embedding mapping."
  },
  {
    id: "bge-large-en-v1.5",
    name: "BGE Large EN v1.5",
    provider: "Local",
    type: "embedding",
    contextWindow: 512,
    parameters: "335M",
    latencyMs: 8,
    vramRequiredGb: 0.8,
    rpmLimit: 10000,
    status: "Deployed",
    description: "High-performance text embedding model, perfect for dense retrieval in Retrieval-Augmented Generation (RAG) tasks."
  }
];

export const initialSessions: PlaygroundSession[] = [
  {
    id: "sess_1",
    title: "SQL Schema Query Refactoring",
    modelId: "llama3-8b-instruct",
    temperature: 0.2,
    maxTokens: 1024,
    topP: 0.9,
    presencePenalty: 0.1,
    jsonMode: false,
    createdAt: "2026-07-19 14:23",
    messages: [
      { id: "m1", role: "system", content: "You are an expert SQL engineer. Return only optimal queries.", timestamp: "2026-07-19 14:23" },
      { id: "m2", role: "user", content: "Optimize this query: SELECT * FROM orders WHERE user_id IN (SELECT id FROM users WHERE signup_date > '2026-01-01')", timestamp: "2026-07-19 14:23" },
      { id: "m3", role: "assistant", content: "You can optimize this query by converting the subquery into an `INNER JOIN`, which allows the database planner to use indexes more efficiently:\n\n```sql\nSELECT o.*\nFROM orders o\nINNER JOIN users u ON o.user_id = u.id\nWHERE u.signup_date > '2026-01-01';\n```\n\nEnsure there is a composite index on `users(signup_date, id)` and an index on `orders(user_id)`.", timestamp: "2026-07-19 14:24" }
    ]
  },
  {
    id: "sess_2",
    title: "Customer Support Classifier",
    modelId: "llama3-8b-instruct",
    temperature: 0.1,
    maxTokens: 256,
    topP: 0.95,
    presencePenalty: 0.0,
    jsonMode: true,
    createdAt: "2026-07-19 11:02",
    messages: [
      { id: "m4", role: "system", content: "Analyze user queries and categorize into: Refund, Technical, Billing, shipping. Return JSON as {\"category\": string, \"confidence\": float, \"urgency_level\": \"low\" | \"medium\" | \"high\"}", timestamp: "2026-07-19 11:02" },
      { id: "m5", role: "user", content: "I've been charged twice for my subscription this month and need this sorted immediately!", timestamp: "2026-07-19 11:02" },
      { id: "m6", role: "assistant", content: "{\n  \"category\": \"Billing\",\n  \"confidence\": 0.99,\n  \"urgency_level\": \"high\"\n}", timestamp: "2026-07-19 11:03" }
    ]
  }
];

export const initialApiLogs: ApiRequestLog[] = [
  {
    id: "req_1",
    method: "POST",
    url: "https://api.openmind.ai/v1/chat/completions",
    status: 200,
    timeMs: 420,
    sizeBytes: 1240,
    timestamp: "2026-07-19T22:10:15Z",
    requestHeaders: {
      "Content-Type": "application/json",
      "Authorization": "Bearer om_••••••••k49e"
    },
    requestBody: JSON.stringify({
      model: "llama3-8b-instruct",
      messages: [{ role: "user", content: "How is deep learning related to neural networks?" }],
      temperature: 0.7
    }, null, 2),
    responseBody: JSON.stringify({
      id: "chatcmpl-9e8d47fe",
      object: "chat.completion",
      created: 1784489415,
      model: "llama3-8b-instruct",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: "Deep learning is a specialized subfield of machine learning that is entirely based on artificial neural networks (ANNs). Specifically, 'deep' refers to neural networks that contain multiple hidden layers (typically more than three) between the input and output layers, allowing the network to automatically extract complex, hierarchical features from raw data."
        },
        finish_reason: "stop"
      }],
      usage: { prompt_tokens: 15, completion_tokens: 65, total_tokens: 80 }
    }, null, 2)
  },
  {
    id: "req_2",
    method: "GET",
    url: "https://api.openmind.ai/v1/models",
    status: 200,
    timeMs: 45,
    sizeBytes: 852,
    timestamp: "2026-07-19T22:08:33Z",
    requestHeaders: {
      "Authorization": "Bearer om_••••••••k49e"
    },
    requestBody: "{}",
    responseBody: JSON.stringify({
      object: "list",
      data: [
        { id: "llama3-8b-instruct", object: "model", created: 1782342000, owned_by: "meta" },
        { id: "deepseek-r1-7b", object: "model", created: 1782343000, owned_by: "deepseek" }
      ]
    }, null, 2)
  },
  {
    id: "req_3",
    method: "POST",
    url: "https://api.openmind.ai/v1/embeddings",
    status: 401,
    timeMs: 14,
    sizeBytes: 156,
    timestamp: "2026-07-19T22:05:12Z",
    requestHeaders: {
      "Content-Type": "application/json",
      "Authorization": "Bearer om_invalid_key"
    },
    requestBody: JSON.stringify({
      model: "bge-large-en-v1.5",
      input: "Embed this short sentence"
    }, null, 2),
    responseBody: JSON.stringify({
      error: {
        message: "Invalid API key provided. Please generate or check your settings.",
        type: "invalid_request_error",
        code: "invalid_api_key"
      }
    }, null, 2)
  }
];

export const initialMemoryNodes: MemoryNode[] = [];

export const initialMemoryLogs: MemoryLog[] = [];

export const initialSources: IngestedSource[] = [];

export const initialWorkflows: Workflow[] = [
  {
    id: "wf_1",
    name: "L1 Triage Bot",
    description: "Intercepts application errors from logs, queries memory for past resolutions, and drafts a solution pull-request.",
    trigger: "Log Severity = ERROR",
    steps: [
      { id: "s1_1", name: "Parse Error Context", type: "Condition", config: { regex: "(?i)exception|error" } },
      { id: "s1_2", name: "Query Semantic Memory", type: "Memory_Fetch", config: { lookup_tier: "Semantic", threshold: 0.75 } },
      { id: "s1_3", name: "Generate Solution Proposal", type: "LLM", config: { model: "llama3-8b-instruct", temperature: 0.1 } },
      { id: "s1_4", name: "Request Engineer Approval", type: "Human_Approval", config: { notification: "slack" } }
    ],
    status: "Active",
    lastRun: "2026-07-19 21:40"
  },
  {
    id: "wf_2",
    name: "Data Enrichment Pipeline",
    description: "Ingests raw database exports and uses GPT-4o to add standard categorization and sentiment tags.",
    trigger: "Cron: Every hour",
    steps: [
      { id: "s2_1", name: "Fetch Fresh Records", type: "API_Call", config: { endpoint: "https://db.internal/v1/sync" } },
      { id: "s2_2", name: "Batch Categorize", type: "LLM", config: { model: "gpt-4o", batch_size: 50 } },
      { id: "s2_3", name: "Writeback To Postgres", type: "API_Call", config: { method: "PUT" } }
    ],
    status: "Active",
    lastRun: "2026-07-19 22:00"
  },
  {
    id: "wf_3",
    name: "Stale Connection Analyzer",
    description: "Tracks active API explorer test requests and alerts if latency spikes above 2500ms.",
    trigger: "API request latency > 2500ms",
    steps: [
      { id: "s3_1", name: "Gather Latency Metrics", type: "Condition", config: { metric: "latency", max_value: 2500 } },
      { id: "s3_2", name: "Send Alerts", type: "API_Call", config: { webhook_url: "https://pagerduty.internal/webhook" } }
    ],
    status: "Draft",
    lastRun: "Never"
  }
];

export const initialBenchmarks: BenchmarkResult[] = [
  { modelId: "llama3-8b-instruct", modelName: "Llama 3 8B Instruct", ttftMs: 28, tps: 84.5, latencyMs: 35, accuracy: 82.4, vramGb: 6.5, costPer1k: 0.0 },
  { modelId: "deepseek-r1-7b", modelName: "DeepSeek R1 7B", ttftMs: 140, tps: 42.1, latencyMs: 95, accuracy: 89.1, vramGb: 5.8, costPer1k: 0.0 },
  { modelId: "nvidia-ising-1.5-31b", modelName: "NVIDIA Ising 1.5 31B", ttftMs: 80, tps: 55.0, latencyMs: 85, accuracy: 90.2, vramGb: 0.0, costPer1k: 0.001 },
  { modelId: "gpt-4o", modelName: "GPT-4o", ttftMs: 90, tps: 78.4, latencyMs: 120, accuracy: 94.8, vramGb: 0.0, costPer1k: 0.0025 }
];

export const initialLogs: LogEntry[] = [
  { id: "l1", timestamp: "2026-07-19 22:15:01.241", severity: "INFO", source: "CORE_VM", message: "Starting OpenMind core VM execution loop... Core modules initialized cleanly." },
  { id: "l2", timestamp: "2026-07-19 22:15:02.102", severity: "INFO", source: "MODEL_INFRA", message: "Successfully allocated 6.5GB VRAM for local model: Llama 3 8B Instruct." },
  { id: "l3", timestamp: "2026-07-19 22:15:04.981", severity: "INFO", source: "MEMORY_DB", message: "Semantic index loaded successfully. 5 nodes indexed from vector DB store." },
  { id: "l4", timestamp: "2026-07-19 22:16:30.150", severity: "WARN", source: "API_GATEWAY", message: "API key validation mismatch warning on endpoint `/v1/embeddings`.", metadata: { request_id: "req_3", origin_ip: "192.168.1.104", supplied_key_prefix: "om_invalid" } },
  { id: "l5", timestamp: "2026-07-19 22:17:15.541", severity: "ERROR", source: "ORCHESTRATOR", message: "Workflow 'Data Enrichment Pipeline' returned execution failure on step 3. Connection refused from db.internal.", metadata: { workflow_id: "wf_2", error_trace: "ConnectionError: Dial tcp 10.0.4.15:5432: connect: connection refused\n  at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1605:16)\n  at Connection.connect (node:internal/database/client:112:5)" } },
  { id: "l6", timestamp: "2026-07-19 22:18:00.012", severity: "INFO", source: "INGEST_PIPE", message: "Successfully chunked Markdown source 'System_Architecture_Layout.md' into 12 dense nodes." }
];

export const initialSettings: SystemSettings = {
  generalName: "OpenMind AI Platform",
  generalDesc: "High-performance AI model routing gateway, playground workspace, agent workflows manager, and local embedding retrieval core.",
  githubUrl: "https://github.com/openmind-org/openmind-console",
  fallbackModelId: "llama3-8b-instruct",
  sessionTimeoutMin: 60,
  apiKeys: [
    { id: "key_1", name: "Default Production Token", keyPrefix: "om_prod_k49ex", createdAt: "2026-07-10", lastUsed: "2026-07-19 22:10" },
    { id: "key_2", name: "Local Dev Key", keyPrefix: "om_dev_l91pq", createdAt: "2026-07-15", lastUsed: "2026-07-19 21:50" }
  ],
  activeProviders: ["Local", "Cloud"],
  theme: "Sophisticated Dark"
};
