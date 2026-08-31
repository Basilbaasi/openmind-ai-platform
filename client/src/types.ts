/**
 * Shared Type Definitions for OpenMind AI Platform
 */

export interface SystemStatus {
  health: "Healthy" | "Degraded" | "Critical";
  uptime: string;
  version: string;
  cpuUsage: number;
  gpuUsage: number;
  vramTotal: number;
  vramUsed: number;
  ramTotal: number;
  ramUsed: number;
}

export interface Model {
  id: string;
  name: string;
  provider: "Local" | "Cloud" | "Custom";
  type: "text" | "image" | "embedding" | "vision";
  contextWindow: number;
  parameters: string;
  latencyMs: number;
  vramRequiredGb: number;
  rpmLimit: number;
  status: "Deployed" | "Offline" | "Syncing";
  description: string;
  adapterCode?: string;        // Python adapter code for this model's provider
  modelApiKey?: string;        // API key for this specific model (stored per-model)
  modelApiKeyMasked?: string;  // Masked API key display from server
  localRunCommand?: string;    // Docker run command for locally partitioned container
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  id: string;
  timestamp: string;
}

export interface PlaygroundSession {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  presencePenalty: number;
  jsonMode: boolean;
  createdAt: string;
}

export interface ApiRequestLog {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  status: number;
  timeMs: number;
  sizeBytes: number;
  timestamp: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseBody: string;
}

export interface MemoryNode {
  id: string;
  label: string;
  tier: "Conversation" | "Semantic" | "Long-Term";
  category: string;
  timestamp: string;
  value: string;
  connections: string[]; // array of target node IDs
}

export interface MemoryLog {
  id: string;
  timestamp: string;
  tier: "Conversation" | "Semantic" | "Long-Term";
  operation: "Read" | "Write" | "Prune" | "Consolidate";
  text: string;
}

export interface IngestedSource {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
  chunksCount: number;
  embeddingSize: number;
  status: "Indexed" | "Processing" | "Failed";
  progress: number;
  createdAt: string;
  embeddingModel?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: "LLM" | "Condition" | "API_Call" | "Memory_Fetch" | "Human_Approval";
  config: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
  status: "Active" | "Draft" | "Error";
  lastRun: string;
}

export interface BenchmarkResult {
  modelId: string;
  modelName: string;
  ttftMs: number; // Time to First Token
  tps: number; // Tokens per second
  latencyMs: number;
  accuracy: number; // percentage
  vramGb: number;
  costPer1k: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  severity: "INFO" | "WARN" | "ERROR";
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsed: string;
}

export interface SystemSettings {
  generalName: string;
  generalDesc: string;
  githubUrl: string;
  fallbackModelId: string;
  sessionTimeoutMin: number;
  apiKeys: ApiKey[];
  activeProviders: string[];
  theme: "Slate Dark" | "Cyberpunk Light" | "Midnight Blue" | "Emerald Minimal" | "Sophisticated Dark";
}
