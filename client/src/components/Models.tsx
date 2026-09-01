import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  Edit2,
  Cpu,
  Layers,
  Activity,
  Search,
  CheckCircle,
  Clock,
  X,
  AlertTriangle,
  Code,
  Key,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Copy,
  ClipboardCheck,
  Play,
  Sparkles,
  RefreshCw,
  Zap,
  Check,
  Terminal
} from "lucide-react";
import { Model } from "../types";
import { modelsApi } from "../api/client";

interface ModelsProps {
  models: Model[];
  onAddModel: (model: Model) => Promise<void>;
  onUpdateModel: (model: Model) => Promise<void>;
  onDeleteModel: (id: string) => void;
  vramUsed: number;
  vramTotal: number;
}

const DEFAULT_LLM_ADAPTER_PLACEHOLDER = `# NVIDIA / OpenAI-compatible adapter.
# Do NOT assign stream. The platform injects it per request.
import requests

invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "text/event-stream" if stream else "application/json",
    "Accept-Encoding": "identity",
    "Content-Type": "application/json",
}
payload = {
    "model": "your-provider-model-id",
    "messages": messages,
    "max_tokens": max_tokens,
    "temperature": temperature,
    "top_p": top_p,
    "stream": stream,
}
response = requests.post(invoke_url, headers=headers, json=payload, stream=stream, timeout=120)
response.raise_for_status()

if stream:
    for line in response.iter_lines(chunk_size=1, decode_unicode=True):
        if line:
            print(line)
else:
    response_text = response.json()["choices"][0]["message"]["content"]`;

const DEFAULT_EMBEDDING_ADAPTER_PLACEHOLDER = `# NVIDIA Nemotron-3 Embedding Adapter (Local NIM / Cloud)
import requests

# For Local NVIDIA NIM container: "http://host.docker.internal:8001/v1/embeddings"
# For NVIDIA Cloud NIM: "https://integrate.api.nvidia.com/v1/embeddings"
invoke_url = "http://host.docker.internal:8001/v1/embeddings"

headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
}
if api_key and api_key.strip():
    headers["Authorization"] = f"Bearer {api_key}"

payload = {
    "input": input,
    "model": "nvidia/nemotron-3-embed-1b",
    "input_type": input_type,
    "encoding_format": "float"
}

response = requests.post(invoke_url, headers=headers, json=payload, timeout=60)
response.raise_for_status()

data = response.json()
embeddings = [item["embedding"] for item in data["data"]]`;

const DEFAULT_NEMOTRON_DOCKER_CMD = `# ── WINDOWS POWERSHELL COMMANDS ──
# 1. Set your NGC API Key
$env:NGC_API_KEY = "<YOUR_NGC_API_KEY>"

# 2. Login to NVIDIA Container Registry
$env:NGC_API_KEY | docker login nvcr.io -u '$oauthtoken' --password-stdin

# 3. Create local cache folder
$NIM_CACHE = "$HOME\\.cache\\nim"
if (!(Test-Path $NIM_CACHE)) { New-Item -ItemType Directory -Path $NIM_CACHE -Force }

# 4. Run NVIDIA Nemotron Container on port 8001
docker run -it --rm \`
    --gpus all \`
    --shm-size=16GB \`
    -e NGC_API_KEY=$env:NGC_API_KEY \`
    -v "\${NIM_CACHE}:/opt/nim/.cache" \`
    -p 8001:8000 \`
    nvcr.io/nim/nvidia/nemotron-3-embed-1b:latest

# ── LINUX / WSL BASH EQUIVALENT ──
# echo "$NGC_API_KEY" | docker login nvcr.io -u '$oauthtoken' --password-stdin
# docker run -it --rm --gpus all --shm-size=16GB -e NGC_API_KEY -v ~/.cache/nim:/opt/nim/.cache -p 8001:8000 nvcr.io/nim/nvidia/nemotron-3-embed-1b:latest`;

const DEFAULT_BGE_DOCKER_CMD = `# ── INSTANT ZERO-WAIT LOCAL EMBEDDING SERVER (Port 8001) ──
# Runs BAAI/bge-small-en-v1.5 (or any HuggingFace embedding model)

# Option A: Run the pre-built image (Instant 1-second startup):
docker run -it --rm -p 8001:8001 openmind-embed-server:latest

# Option B: Run in the background:
# docker run -d --name openmind-embed-server -p 8001:8001 openmind-embed-server:latest
# docker start openmind-embed-server
# docker stop openmind-embed-server`;

const DEFAULT_BGE_ADAPTER_CODE = `import requests

# Universal HuggingFace local container endpoint
url = "http://host.docker.internal:8001/embed"

headers = {
    "Content-Type": "application/json"
}

if api_key and api_key.strip():
    headers["Authorization"] = f"Bearer {api_key}"

payload = {
    "input": input,
    "input_type": input_type
}

response = requests.post(
    url,
    headers=headers,
    json=payload,
    timeout=60
)

response.raise_for_status()

data = response.json()
embeddings = data.get("embeddings") or [item["embedding"] for item in data.get("data", [])]`;

const UNIVERSAL_ALL_IN_ONE_PROMPT = `I want to deploy this AI model (HuggingFace / SentenceTransformers / NVIDIA NIM / Ollama / vLLM / custom model) for my OpenMind AI Platform to use in RAG semantic search, document ingestion, and AI chat.

Input model info or code snippet:
PASTE_MODEL_NAME_OR_SNIPPET_HERE

Please generate exactly TWO separate clean code blocks with NO conversational text:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOCK 1: BACKEND DOCKER / RUNNER SCRIPT (Windows PowerShell & Linux)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generate the command to run this model as a local server mapped to host port 8001:
• For HuggingFace / SentenceTransformer embeddings (e.g. BAAI/bge-small-en-v1.5, all-MiniLM-L6-v2, sentence-transformers):
  Provide the fast UV Docker microserver command:
  docker run -it --rm -p 8001:8001 -e MODEL_NAME="<MODEL_ID>" -v "\${PWD}:/app" ghcr.io/astral-sh/uv:python3.11-bookworm-slim sh -c "uv pip install --system --extra-index-url https://download.pytorch.org/whl/cpu torch fastapi uvicorn sentence-transformers && python /app/embed_server.py"
• For NVIDIA NIM containers:
  Provide docker run mapped to -p 8001:8000 with NGC_API_KEY, -v "$HOME\\.cache\\nim:/opt/nim/.cache", and --gpus all.
• For Ollama models:
  docker run -d -p 8001:11434 --name ollama ollama/ollama && docker exec ollama ollama pull <MODEL>
• For LLM containers (vLLM / TGI):
  Map container port to host 8001 with GPU flags.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOCK 2: OPENMIND PYTHON ADAPTER CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generate the Python adapter code for OpenMind:
• Endpoint: Connects to "http://host.docker.internal:8001/embed" (for TEI/embed_server) or "http://host.docker.internal:8001/v1/embeddings" (for NIM) or "http://host.docker.internal:8001/v1/chat/completions" (for LLMs).
• For Embedding Models:
  Injected variables available: api_key (str), input (list[str]), input_type (str).
  Sends POST request, calls response.raise_for_status(), and returns vector list assigned to 'embeddings'.
• For LLM Models:
  Injected variables available: api_key (str), messages (list[dict]), stream (bool), temperature, max_tokens.
  Assigns response string to 'response_text' (or streams SSE lines when stream=True).
• Code must be 100% valid Python with clean 4-space indentation.`;

const DOCKER_RUNNER_GENERATOR_PROMPT = `Generate executable Windows PowerShell and Linux Bash Docker startup scripts to self-host this AI model (NVIDIA NIM, HuggingFace TEI, vLLM, Ollama, or custom container) for OpenMind AI Platform (used for RAG retrieval, document chunking, or LLM inference).

Return exactly one code block containing both Windows PowerShell and Linux Bash startup commands.

Requirements:
1. Windows PowerShell: Use PowerShell syntax ($env:NGC_API_KEY / $env:HF_TOKEN, $HOME\\.cache\\nim, and backtick \` line continuations).
2. Linux Bash: Use standard export VAR=... and \\ line continuations.
3. If model requires registry authentication (NVIDIA NGC nvcr.io or HuggingFace):
   - PowerShell: $env:NGC_API_KEY | docker login nvcr.io -u '$oauthtoken' --password-stdin
   - Bash: echo "$NGC_API_KEY" | docker login nvcr.io -u '$oauthtoken' --password-stdin
4. Set up persistent host volume cache directories (e.g. ~/.cache/nim or ~/.cache/huggingface) so weights are downloaded once.
5. Map container port to host port 8001 (e.g. -p 8001:8000 or -p 8001:80) to avoid conflict with OpenMind's port 8000.
6. Include GPU flags: --gpus all, --shm-size=16GB, -e NGC_API_KEY / -e HUGGING_FACE_HUB_TOKEN, and -it --rm flags.
7. Include any known architecture flags (e.g. -e PIPELINE_ID=packed-hopper-fp16 for Ada/RTX 40 series NIMs).
8. Use exact container image name, tags, and parameters from the model documentation provided.

Model details or documentation to transform:
PASTE_MODEL_OR_DOCKER_DETAILS_HERE`;

const LLM_ADAPTER_PROMPT = `Transform the provider's Python chat-completions or self-hosted Docker example below into executable Python adapter code for OpenMind (used for Chat, RAG Augmented Generation, and reasoning). Return exactly one fenced Python code block and no explanation. Use four-space indentation.

These runtime variables already exist in OpenMind. Do not define or overwrite them:
api_key (str), messages (full ordered chat history + retrieved RAG context), user_message (latest message), temperature (float), max_tokens (int), top_p (float), stream (bool controlled by the platform).

Requirements:
1. Preserve provider endpoint (or use "http://host.docker.internal:8001/v1/chat/completions" for self-hosted local containers), model ID, and required headers.
2. If using api_key, check: "if api_key and api_key.strip(): headers['Authorization'] = f'Bearer {api_key}'".
3. Use "messages": messages to retain multi-turn context and retrieved RAG context documents.
4. Use temperature, max_tokens, and top_p when supported.
5. Never hardcode stream. Use "stream": stream in payload and requests.post(..., stream=stream).
6. For stream=True: iterate response.iter_lines(chunk_size=1, decode_unicode=True) and print raw SSE lines.
7. For stream=False: assign the final answer string to response_text.
8. Code must pass Python syntax validation.

Provider example to transform:
PASTE_PROVIDER_EXAMPLE_HERE`;

const EMBEDDING_ADAPTER_PROMPT = `Transform the provider's Python embeddings API example or self-hosted Docker example below into executable Python adapter code for OpenMind's RAG & Knowledge Subsystem (used for document semantic chunking and real-time query vector search).

Return exactly one fenced Python code block and no explanation. Use four-space indentation.

These runtime variables already exist in OpenMind. Do not define or overwrite them:
api_key (str)      — Provider API key (or NGC key)
input (list[str])  — Batch of text chunks to embed (during RAG ingestion) or single query
input_type (str)   — "passage" (for document chunking) or "query" (for search retrieval)

Requirements for RAG & Semantic Search:
1. Endpoint: Use "http://host.docker.internal:8001/embed" (for HuggingFace TEI) or "http://host.docker.internal:8001/v1/embeddings" (for NIM), or preserve provider cloud URL.
2. Auth: Check "if api_key and api_key.strip(): headers['Authorization'] = f'Bearer {api_key}'" so local unauthenticated containers run cleanly.
3. Payload: For TEI use {"inputs": input}, for OpenAI/NIM use {"input": input, "model": "<MODEL_ID>", "input_type": input_type, "encoding_format": "float"}.
4. Do not include chat-completion fields (messages, temperature, max_tokens, stream).
5. Call response.raise_for_status().
6. Parse JSON response and assign the final list of float vectors to 'embeddings'.
7. Preserve strict 1:1 input order (e.g. embeddings = response.json()).
8. Code must pass Python syntax validation.

Provider example to transform:
PASTE_PROVIDER_EXAMPLE_HERE`;

export default function Models({
  models,
  onAddModel,
  onUpdateModel,
  onDeleteModel,
  vramUsed,
  vramTotal
}: ModelsProps) {
  const [filter, setFilter] = useState<"All" | "Local" | "Cloud">("All");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);

  // Deploy Menu State
  const [deployMenuOpen, setDeployMenuOpen] = useState(false);
  const [deploymentKind, setDeploymentKind] = useState<"llm" | "embedding">("llm");
  const deployMenuRef = useRef<HTMLDivElement>(null);

  // Close deploy dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deployMenuRef.current && !deployMenuRef.current.contains(event.target as Node)) {
        setDeployMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Form State — Basic Info
  const [formName, setFormName] = useState("");
  const [formProvider, setFormProvider] = useState<"Local" | "Cloud" | "Custom">("Local");
  const [formType, setFormType] = useState<"text" | "image" | "embedding" | "vision">("text");
  const [formContext, setFormContext] = useState(8192);
  const [formParams, setFormParams] = useState("8B");
  const [formLatency, setFormLatency] = useState(30);
  const [formVram, setFormVram] = useState(0);
  const [formRpm, setFormRpm] = useState(1000);
  const [formDesc, setFormDesc] = useState("");

  // Form State — Local Runner Docker Command
  const [formLocalRunCommand, setFormLocalRunCommand] = useState("");
  const [copiedRunCommand, setCopiedRunCommand] = useState(false);
  const [copiedRunnerPrompt, setCopiedRunnerPrompt] = useState(false);
  const [copiedUniversalPrompt, setCopiedUniversalPrompt] = useState(false);

  // Form State — Schema & Adapter
  const [formApiKey, setFormApiKey] = useState("");
  const [formAdapterCode, setFormAdapterCode] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showVariableRef, setShowVariableRef] = useState(true);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Testing Interface State
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testInputText, setTestInputText] = useState("OpenMind semantic embedding search test");
  const [testInputType, setTestInputType] = useState<"query" | "passage">("query");
  const [isTestingAdapter, setIsTestingAdapter] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isProbingPort, setIsProbingPort] = useState(false);
  const [portStatus, setPortStatus] = useState<"online" | "offline" | null>(null);

  const isEmbedding = deploymentKind === "embedding" || formType === "embedding";

  const handleProbePort8001 = async () => {
    setIsProbingPort(true);
    setPortStatus(null);
    try {
      await modelsApi.testAdapter({
        type: isEmbedding ? "embedding" : "text",
        adapter_code: `import requests\nr = requests.get("http://host.docker.internal:8001/health", timeout=3)\nembeddings = [[0.1, 0.2]]\nresponse_text = "ok"`
      });
      setPortStatus("online");
    } catch {
      try {
        await modelsApi.testAdapter({
          type: isEmbedding ? "embedding" : "text",
          adapter_code: `import requests\nr = requests.get("http://host.docker.internal:8001/v1/health/live", timeout=3)\nembeddings = [[0.1, 0.2]]\nresponse_text = "ok"`
        });
        setPortStatus("online");
      } catch {
        setPortStatus("offline");
      }
    } finally {
      setIsProbingPort(false);
    }
  };

  const copyProviderPrompt = async () => {
    const promptToCopy = isEmbedding ? EMBEDDING_ADAPTER_PROMPT : LLM_ADAPTER_PROMPT;
    await navigator.clipboard.writeText(promptToCopy);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 1800);
  };

  const copyRunnerPrompt = async () => {
    await navigator.clipboard.writeText(DOCKER_RUNNER_GENERATOR_PROMPT);
    setCopiedRunnerPrompt(true);
    window.setTimeout(() => setCopiedRunnerPrompt(false), 1800);
  };

  const copyUniversalPrompt = async () => {
    await navigator.clipboard.writeText(UNIVERSAL_ALL_IN_ONE_PROMPT);
    setCopiedUniversalPrompt(true);
    window.setTimeout(() => setCopiedUniversalPrompt(false), 1800);
  };

  const copyDockerCommand = async () => {
    if (!formLocalRunCommand) return;
    await navigator.clipboard.writeText(formLocalRunCommand);
    setCopiedRunCommand(true);
    window.setTimeout(() => setCopiedRunCommand(false), 1800);
  };

  const loadBgePreset = () => {
    setFormName("bge-small-en-v1.5");
    setFormProvider("Local");
    setFormType("embedding");
    setFormContext(512);
    setFormParams("33M");
    setFormLatency(8);
    setFormVram(0.2);
    setFormRpm(10000);
    setFormDesc("BAAI/bge-small-en-v1.5 HuggingFace model hosted via Text Embeddings Inference (TEI) for fast RAG retrieval.");
    setFormLocalRunCommand(DEFAULT_BGE_DOCKER_CMD);
    setFormAdapterCode(DEFAULT_BGE_ADAPTER_CODE);
  };

  const loadNemotronPreset = () => {
    setFormName("nemotron-3-embed-1b");
    setFormProvider("Local");
    setFormType("embedding");
    setFormContext(512);
    setFormParams("1B");
    setFormLatency(15);
    setFormVram(0.8);
    setFormRpm(5000);
    setFormDesc("NVIDIA Nemotron-3 1B dense text embedding model for semantic search and RAG retrieval.");
    setFormLocalRunCommand(DEFAULT_NEMOTRON_DOCKER_CMD);
    setFormAdapterCode(DEFAULT_EMBEDDING_ADAPTER_PLACEHOLDER);
  };

  const handleOpenAddLLM = () => {
    setDeployMenuOpen(false);
    setDeploymentKind("llm");
    setEditingModel(null);
    setFormName("");
    setFormProvider("Cloud");
    setFormType("text");
    setFormContext(8192);
    setFormParams("8B");
    setFormLatency(30);
    setFormVram(0);
    setFormRpm(1000);
    setFormDesc("");
    setFormLocalRunCommand("");
    setFormApiKey("");
    setFormAdapterCode("");
    setShowApiKey(false);
    setFormError(null);
    setShowVariableRef(true);
    setShowAdvancedFields(false);
    setShowTestPanel(false);
    setTestResult(null);
    setTestError(null);
    setIsFormOpen(true);
  };

  const handleOpenAddEmbedding = () => {
    setDeployMenuOpen(false);
    setDeploymentKind("embedding");
    setEditingModel(null);
    setFormName("nemotron-3-embed-1b");
    setFormProvider("Local");
    setFormType("embedding");
    setFormContext(512);
    setFormParams("1B");
    setFormLatency(15);
    setFormVram(0.8);
    setFormRpm(5000);
    setFormDesc("NVIDIA Nemotron-3 1B dense text embedding model for semantic search and RAG retrieval.");
    setFormLocalRunCommand(DEFAULT_NEMOTRON_DOCKER_CMD);
    setFormApiKey("");
    setFormAdapterCode(DEFAULT_EMBEDDING_ADAPTER_PLACEHOLDER);
    setShowApiKey(false);
    setFormError(null);
    setShowVariableRef(true);
    setShowAdvancedFields(false);
    setShowTestPanel(false);
    setTestResult(null);
    setTestError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (model: Model) => {
    setEditingModel(model);
    setDeploymentKind(model.type === "embedding" ? "embedding" : "llm");
    setFormName(model.name);
    setFormProvider(model.provider);
    setFormType(model.type);
    setFormContext(model.contextWindow);
    setFormParams(model.parameters);
    setFormLatency(model.latencyMs);
    setFormVram(model.vramRequiredGb);
    setFormRpm(model.rpmLimit);
    setFormDesc(model.description);
    setFormLocalRunCommand(model.localRunCommand || "");
    setFormApiKey(model.modelApiKey || "");
    setFormAdapterCode(model.adapterCode || "");
    setShowApiKey(false);
    setFormError(null);
    setShowVariableRef(false);
    setShowAdvancedFields(true);
    setShowTestPanel(false);
    setTestResult(null);
    setTestError(null);
    setIsFormOpen(true);
  };

  const handleRunAdapterTest = async () => {
    if (!formAdapterCode.trim()) {
      setTestError("Please enter or paste your adapter code before running a test.");
      return;
    }
    setIsTestingAdapter(true);
    setTestResult(null);
    setTestError(null);

    try {
      if (isEmbedding) {
        const res = await modelsApi.testAdapter({
          type: "embedding",
          model_id: editingModel?.id,
          adapter_code: formAdapterCode,
          api_key: formApiKey,
          input: [testInputText],
          input_type: testInputType,
        });
        setTestResult(res);
      } else {
        const res = await modelsApi.testAdapter({
          type: formType,
          model_id: editingModel?.id,
          adapter_code: formAdapterCode,
          api_key: formApiKey,
          user_message: "Hello, this is a test prompt from OpenMind.",
        });
        setTestResult(res);
      }
    } catch (err: any) {
      setTestError(err.message || "Failed to execute adapter test.");
    } finally {
      setIsTestingAdapter(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setFormError(null);

    try {
      if (editingModel) {
        await onUpdateModel({
          ...editingModel,
          name: formName,
          provider: formProvider,
          type: formType,
          contextWindow: formContext,
          parameters: formParams,
          latencyMs: formLatency,
          vramRequiredGb: formVram,
          rpmLimit: formRpm,
          description: formDesc,
          localRunCommand: formProvider === "Local" ? formLocalRunCommand : undefined,
          adapterCode: formAdapterCode,
          modelApiKey: formApiKey || editingModel.modelApiKey
        });
      } else {
        await onAddModel({
          id: "model_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
          name: formName,
          provider: formProvider,
          type: formType,
          contextWindow: formContext,
          parameters: formParams,
          latencyMs: formLatency,
          vramRequiredGb: formVram,
          rpmLimit: formRpm,
          status: "Deployed",
          description: formDesc,
          localRunCommand: formProvider === "Local" ? formLocalRunCommand : undefined,
          adapterCode: formAdapterCode,
          modelApiKey: formApiKey
        });
      }
      setIsFormOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not deploy this model.");
    }
  };

  const filteredModels = models.filter((model) => {
    const matchesFilter = filter === "All" || model.provider === filter;
    const matchesSearch =
      model.name.toLowerCase().includes(search.toLowerCase()) ||
      model.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div id="models-view" className="space-y-6">
      {/* Top filter section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0a0a0b] border border-[#1c1c1e] p-4 rounded-lg">
        <div className="flex flex-wrap items-center gap-1.5">
          {["All", "Local", "Cloud"].map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                filter === p
                  ? "bg-[#161618] text-white border border-[#2c2c2e] shadow-sm"
                  : "bg-transparent text-[#888888] hover:text-white"
              }`}
            >
              {p} Providers
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-[#555555] absolute left-3 top-2.5" />
            <input
              id="model-search"
              type="text"
              placeholder="Search model registry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-black text-xs border border-[#1c1c1e] hover:border-[#2c2c2e] rounded pl-9 pr-3 py-2 w-full text-white focus:outline-none focus:border-white font-sans"
            />
          </div>

          {/* Deploy Model Dropdown Button */}
          <div className="relative" ref={deployMenuRef}>
            <button
              id="deploy-model-btn"
              onClick={() => setDeployMenuOpen(!deployMenuOpen)}
              className="px-4 py-2 bg-white text-black text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-200 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
            >
              <Plus className="w-4 h-4" /> Deploy <ChevronDown className={`w-3 h-3 transition-transform ${deployMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Deploy Options Dropdown */}
            <AnimatePresence>
              {deployMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-[#111113] border border-[#2c2c2e] rounded-lg shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-1.5 space-y-1">
                    <button
                      onClick={handleOpenAddLLM}
                      className="w-full p-2.5 flex items-start gap-3 rounded hover:bg-[#1c1c1e] transition-colors text-left group"
                    >
                      <div className="p-2 rounded bg-sky-950/40 border border-sky-900/40 text-sky-400 group-hover:bg-sky-900/60 transition-colors shrink-0">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">LLM</span>
                        <span className="text-[10px] text-[#888888] block mt-0.5">
                          Text instruction, chat reasoning & vision models
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={handleOpenAddEmbedding}
                      className="w-full p-2.5 flex items-start gap-3 rounded hover:bg-[#1c1c1e] transition-colors text-left group"
                    >
                      <div className="p-2 rounded bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 group-hover:bg-emerald-900/60 transition-colors shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Embedding Model</span>
                        <span className="text-[10px] text-[#888888] block mt-0.5">
                          Dense vector embedding & semantic RAG retrieval
                        </span>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Grid: Left Model List, Right Resource Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Model Cards Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredModels.map((model) => {
              const typeColors = {
                text: "text-[#e0e0e0] bg-[#161618] border-[#2c2c2e]",
                vision: "text-purple-300 bg-purple-950/20 border-purple-900/30",
                embedding: "text-emerald-300 bg-emerald-950/20 border-emerald-900/30",
                image: "text-pink-300 bg-pink-950/20 border-pink-900/30"
              };
              const hasAdapter = !!(model.adapterCode || (model as any).adapter_code);

              return (
                <motion.div
                  key={model.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-[#111113] border border-[#1c1c1e] hover:border-[#2c2c2e] p-5 rounded-lg flex flex-col justify-between group transition-colors"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white font-serif italic truncate">
                          {model.name}
                        </h3>
                        <span className="text-[10px] text-[#555555] font-mono uppercase tracking-wider mt-0.5 block">
                          {model.parameters} • Context: {model.contextWindow}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {model.provider === "Local" && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono border font-semibold uppercase tracking-wider text-cyan-300 bg-cyan-950/20 border-cyan-900/30" title="Locally Partitioned container">
                            <Terminal className="w-3 h-3 inline-block mr-0.5" />
                            LOCAL
                          </span>
                        )}
                        {hasAdapter && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono border font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-950/20 border-emerald-900/30" title="Adapter code configured">
                            <Code className="w-3 h-3 inline-block mr-0.5" />
                            ADAPTER
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-mono border font-semibold uppercase tracking-wider ${
                            typeColors[model.type] || "text-gray-400"
                          }`}
                        >
                          {model.type}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#888888] font-sans line-clamp-2 mt-2 leading-relaxed">
                      {model.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1c1c1e] flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-3 text-[10px] text-[#555555]">
                      <span>{model.latencyMs}ms</span>
                      <span>{model.vramRequiredGb} GB</span>
                      <span className="text-white font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-white" />
                        {model.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(model)}
                        className="p-1.5 text-[#555555] hover:text-white border border-[#1c1c1e] hover:border-[#2c2c2e] rounded transition-all"
                        title="Edit Model Configuration"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteModel(model.id)}
                        className="p-1.5 text-[#555555] hover:text-rose-400 border border-[#1c1c1e] hover:border-[#2c2c2e] rounded transition-all"
                        title="Tear Down Partition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Resource Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded-lg">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 font-mono">
              <Activity className="w-4 h-4 text-white" /> VRAM Allocation
            </h3>
            <div className="space-y-3 font-mono">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#888888]">Allocated:</span>
                  <span className="font-bold text-white">{vramUsed.toFixed(1)} GB</span>
                </div>
                <div className="w-full bg-black h-2 rounded overflow-hidden border border-[#1c1c1e]">
                  <div
                    className="bg-white h-2 rounded transition-all duration-300"
                    style={{ width: `${Math.min((vramUsed / (vramTotal || 16)) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-[#555555] pt-1">
                <span>Hardware Total:</span>
                <span>{vramTotal} GB</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded-lg space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-white" /> Registry Statistics
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-[#1c1c1e]">
                <span className="text-[#888888]">Total Models:</span>
                <span className="text-white font-bold">{models.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1c1c1e]">
                <span className="text-[#888888]">LLM / Text:</span>
                <span className="text-white font-bold">{models.filter((m) => m.type === "text").length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1c1c1e]">
                <span className="text-[#888888]">Embedding Models:</span>
                <span className="text-emerald-400 font-bold">{models.filter((m) => m.type === "embedding").length}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#888888]">Active Adapters:</span>
                <span className="text-white font-bold">{models.filter((m) => !!m.adapterCode).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── UNIFIED DEPLOY / EDIT MODEL MODAL ── */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111113] border border-[#1c1c1e] rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl font-sans"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-[#1c1c1e] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    {isEmbedding ? (
                      <Layers className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Cpu className="w-4 h-4 text-sky-400" />
                    )}
                    {editingModel
                      ? `Edit ${isEmbedding ? "Embedding" : "LLM"} Model: ${editingModel.name}`
                      : `Deploy New ${isEmbedding ? "Embedding Model" : "LLM Model"}`}
                  </h3>
                  <p className="text-[10px] text-[#888888] font-mono mt-0.5">
                    {isEmbedding
                      ? "Configure dense vector embedding model adapter (receives input/input_type, returns embeddings)"
                      : "Configure chat-completion adapter (receives messages/stream, returns response_text)"}
                  </p>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 text-[#555555] hover:text-white rounded border border-transparent hover:border-[#1c1c1e]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* ── SECTION 1: Basic Info ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white font-bold">
                    {isEmbedding ? <Layers className="w-3.5 h-3.5 text-emerald-400" /> : <Cpu className="w-3.5 h-3.5 text-sky-400" />} Basic Information
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                        Model Name *
                      </label>
                      <input
                        id="form-model-name"
                        type="text"
                        placeholder={isEmbedding ? "e.g. nemotron-3-embed-1b" : "e.g. NVIDIA Ising 1.5 31B"}
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full bg-black border border-[#1c1c1e] focus:border-white focus:outline-none p-2.5 rounded text-white font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                        Provider
                      </label>
                      <select
                        id="form-model-provider"
                        value={formProvider}
                        onChange={(e: any) => setFormProvider(e.target.value)}
                        className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white"
                      >
                        <option value="Local">Local Partition (NIM / Local Container)</option>
                        <option value="Cloud">Cloud API Provider</option>
                        <option value="Custom">Custom Endpoint</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                      Description
                    </label>
                    <textarea
                      id="form-model-desc"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white resize-none"
                      placeholder={isEmbedding ? "NVIDIA Nemotron-3 1B dense text embedding model for semantic search." : "Describe the model's purpose and capabilities..."}
                    />
                  </div>
                </div>

                {/* ── SECTION 1.5: Local Docker / Runner Command (Shown if Provider is Local) ── */}
                {formProvider === "Local" && (
                  <div className="space-y-3 pt-3 border-t border-[#1c1c1e] bg-[#0c121c]/50 p-3.5 rounded border border-cyan-950/30">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-cyan-300 font-bold font-mono">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Local Docker / Container Runner Command
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleProbePort8001}
                          disabled={isProbingPort}
                          title="Check if your local container or microserver is running and reachable on port 8001"
                          className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded border flex items-center gap-1 transition-colors disabled:opacity-50 ${
                            portStatus === "online"
                              ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                              : portStatus === "offline"
                              ? "bg-rose-950/80 border-rose-600 text-rose-300"
                              : "bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-700/50 text-emerald-300 hover:text-white"
                          }`}
                        >
                          {isProbingPort ? <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" /> : <Activity className="w-3 h-3 text-emerald-400" />}
                          {isProbingPort ? "Testing..." : (portStatus === "online" ? "🟢 Port 8001 Online" : (portStatus === "offline" ? "🔴 Port 8001 Offline" : "Check Port 8001"))}
                        </button>
                        <button
                          type="button"
                          onClick={copyUniversalPrompt}
                          title="Copy 1 single prompt for ChatGPT to generate BOTH the Docker startup script AND the OpenMind adapter code"
                          className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-violet-950/60 hover:bg-violet-900/80 text-violet-300 hover:text-white rounded border border-violet-700/50 flex items-center gap-1 transition-colors"
                        >
                          {copiedUniversalPrompt ? <ClipboardCheck className="w-3 h-3 text-emerald-400" /> : <Sparkles className="w-3 h-3 text-violet-400" />}
                          {copiedUniversalPrompt ? "All-in-One Copied" : "Copy All-in-One Prompt"}
                        </button>
                        <button
                          type="button"
                          onClick={copyRunnerPrompt}
                          title="Copy prompt for ChatGPT to generate Docker startup script from any model documentation"
                          className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 hover:text-white rounded border border-cyan-800/40 flex items-center gap-1 transition-colors"
                        >
                          {copiedRunnerPrompt ? <ClipboardCheck className="w-3 h-3 text-emerald-400" /> : <Terminal className="w-3 h-3 text-cyan-400" />}
                          {copiedRunnerPrompt ? "Prompt Copied" : "Copy Runner Prompt"}
                        </button>
                        <button
                          type="button"
                          onClick={copyDockerCommand}
                          className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-[#161618] hover:bg-[#222226] text-[#c7d2fe] hover:text-white rounded border border-[#2c2c2e] flex items-center gap-1 transition-colors"
                        >
                          {copiedRunCommand ? <ClipboardCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedRunCommand ? "Copied" : "Copy Command"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                        Terminal Startup Command (Run this locally before invoking)
                      </label>
                      <textarea
                        id="form-model-run-cmd"
                        value={formLocalRunCommand}
                        onChange={(e) => setFormLocalRunCommand(e.target.value)}
                        rows={5}
                        className="w-full bg-black border border-cyan-950/60 focus:border-cyan-700/60 focus:outline-none p-3 rounded text-cyan-300 font-mono text-[11px] leading-relaxed resize-y whitespace-pre"
                        placeholder="docker run -it --rm --gpus all ..."
                        spellCheck={false}
                      />
                      <p className="text-[9px] text-[#888888] leading-relaxed font-sans">
                        Run this in your local terminal. Since OpenMind runs inside Docker, the adapter reaches your local container via <code className="text-white font-mono bg-black px-1 py-0.5 rounded border border-[#2c2c2e]">http://host.docker.internal:8001/embed</code> or <code className="text-white font-mono bg-black px-1 py-0.5 rounded border border-[#2c2c2e]">http://host.docker.internal:8001/v1/embeddings</code>.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── SECTION 2: API Key ── */}
                <div className="space-y-3 pt-3 border-t border-[#1c1c1e]">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white font-bold">
                    <Key className="w-3.5 h-3.5" /> Provider API Key {formProvider === "Local" && <span className="text-[#555555] font-normal normal-case">(Optional for local unauthenticated containers)</span>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                      API Key {editingModel?.modelApiKeyMasked && <span className="text-[#555555] normal-case tracking-normal">(current: {editingModel.modelApiKeyMasked})</span>}
                    </label>
                    <div className="relative">
                      <input
                        id="form-model-api-key"
                        type={showApiKey ? "text" : "password"}
                        placeholder={editingModel?.modelApiKeyMasked ? "Leave blank to keep existing key" : "e.g. nvapi-... or hf_..."}
                        value={formApiKey}
                        onChange={(e) => setFormApiKey(e.target.value)}
                        className="w-full bg-black border border-[#1c1c1e] focus:border-white focus:outline-none p-2.5 rounded text-white font-mono text-xs pr-10"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-white p-1"
                      >
                        {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── SECTION 3: Adapter Code ── */}
                <div className="space-y-3 pt-3 border-t border-[#1c1c1e]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white font-bold">
                      <Cpu className="w-3.5 h-3.5" /> Model Adapter Configuration
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowVariableRef(!showVariableRef)}
                      className="flex items-center gap-1 text-[9px] text-[#888888] hover:text-white transition-colors"
                    >
                      <BookOpen className="w-3 h-3" />
                      {showVariableRef ? "Hide" : "Show"} Variable Reference
                      {showVariableRef ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="bg-[#111113] border border-[#1e3a5f]/40 rounded p-3 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] text-[#aab4ca] leading-relaxed">
                        {isEmbedding
                          ? "Load ready-to-run HuggingFace BGE / NVIDIA presets, or copy the all-in-one generator prompt."
                          : "Copy a prompt for ChatGPT, paste provider example into it, then copy the Python code below."}
                      </p>
                      <button
                        type="button"
                        onClick={copyUniversalPrompt}
                        className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-violet-950/60 hover:bg-violet-900/80 text-violet-300 hover:text-white rounded border border-violet-700/50 flex items-center gap-1 transition-colors ml-auto"
                      >
                        {copiedUniversalPrompt ? <ClipboardCheck className="w-3 h-3 text-emerald-400" /> : <Sparkles className="w-3 h-3 text-violet-400" />}
                        {copiedUniversalPrompt ? "All-in-One Copied" : "Copy All-in-One Prompt"}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#1c1c1e]">
                      {isEmbedding ? (
                        <>
                          <button
                            type="button"
                            onClick={loadBgePreset}
                            className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/40 text-cyan-300 hover:text-white rounded flex items-center gap-1 transition-colors"
                          >
                            <Zap className="w-3 h-3 text-cyan-400" /> Use BGE-Small (HuggingFace TEI)
                          </button>
                          <button
                            type="button"
                            onClick={loadNemotronPreset}
                            className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider border border-[#2c2c2e] text-[#c7d2fe] hover:text-white rounded transition-colors"
                          >
                            Use Nemotron (NVIDIA NIM)
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setFormAdapterCode(DEFAULT_LLM_ADAPTER_PLACEHOLDER)}
                          className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider border border-[#2c2c2e] text-[#c7d2fe] hover:text-white rounded"
                        >
                          Use NVIDIA Template
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={copyProviderPrompt}
                        className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider bg-white text-black hover:bg-neutral-200 rounded flex items-center gap-1 ml-auto"
                      >
                        {copiedPrompt ? <ClipboardCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedPrompt ? "Copied" : "Copy Adapter Prompt"}
                      </button>
                    </div>
                  </div>

                  {/* Variable Reference Hint Panel */}
                  <AnimatePresence>
                    {showVariableRef && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-[#0d1117] border border-[#1e3a5f]/40 rounded p-4 space-y-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-300 uppercase tracking-wider font-bold">
                            <BookOpen className="w-3.5 h-3.5" />
                            {isEmbedding
                              ? "Embedding Variable Reference — Exact Runtime Variables"
                              : "LLM Variable Reference — Use these exact names in your code"}
                          </div>

                          {isEmbedding ? (
                            <div className="grid grid-cols-2 gap-3">
                              {/* Embedding Input Variables */}
                              <div className="space-y-2">
                                <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                                  ▸ Injected Input Variables
                                </p>
                                <div className="space-y-1 font-mono text-[10px]">
                                  <div className="flex gap-2">
                                    <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded border border-[#1c1c1e] whitespace-nowrap">api_key</code>
                                    <span className="text-[#888888]">→ str — Provider API key</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded border border-[#1c1c1e] whitespace-nowrap">input</code>
                                    <span className="text-[#888888]">→ list[str] — Texts to embed</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded border border-[#1c1c1e] whitespace-nowrap">input_type</code>
                                    <span className="text-[#888888]">→ str — "query" | "passage"</span>
                                  </div>
                                </div>
                              </div>

                              {/* Embedding Output Variable */}
                              <div className="space-y-2">
                                <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                                  ▸ Returned Output Variable
                                </p>
                                <div className="font-mono text-[10px] space-y-1">
                                  <div className="flex gap-2">
                                    <code className="text-emerald-300 bg-black px-1.5 py-0.5 rounded border border-emerald-900/30 whitespace-nowrap">embeddings</code>
                                    <span className="text-[#888888]">→ list[list[float]]</span>
                                  </div>
                                </div>
                                <p className="text-[9px] text-[#888888] leading-relaxed mt-1">
                                  <span className="text-amber-400 font-bold">Note:</span> Embedding adapters do not use LLM chat variables (<code className="text-[#aaa]">messages</code>, <code className="text-[#aaa]">temperature</code>, <code className="text-[#aaa]">stream</code>).
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              {/* LLM Input Variables */}
                              <div className="space-y-2">
                                <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                                  ▸ Input Variables (auto-injected)
                                </p>
                                <div className="space-y-1 font-mono text-[10px]">
                                  <div className="flex gap-2">
                                    <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded border border-[#1c1c1e] whitespace-nowrap">api_key</code>
                                    <span className="text-[#888888]">→ str — Your API key</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded border border-[#1c1c1e] whitespace-nowrap">messages</code>
                                    <span className="text-[#888888]">→ list — Chat history</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded border border-[#1c1c1e] whitespace-nowrap">user_message</code>
                                    <span className="text-[#888888]">→ str — Latest user msg</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded border border-[#1c1c1e] whitespace-nowrap">temperature</code>
                                    <span className="text-[#888888]">→ float</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded border border-[#1c1c1e] whitespace-nowrap">max_tokens</code>
                                    <span className="text-[#888888]">→ int</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded border border-[#1c1c1e] whitespace-nowrap">stream</code>
                                    <span className="text-[#888888]">→ bool, platform-controlled</span>
                                  </div>
                                </div>
                              </div>

                              {/* LLM Output Variable */}
                              <div className="space-y-2">
                                <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">
                                  ▸ Output Variable
                                </p>
                                <div className="font-mono text-[10px] space-y-1">
                                  <div className="flex gap-2">
                                    <code className="text-rose-300 bg-black px-1.5 py-0.5 rounded border border-rose-900/30 whitespace-nowrap">response_text</code>
                                    <span className="text-[#888888]">→ str — Model's reply</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Code Editor Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                      Adapter Code — Python
                    </label>
                    <textarea
                      id="form-model-adapter-code"
                      value={formAdapterCode}
                      onChange={(e) => setFormAdapterCode(e.target.value)}
                      rows={14}
                      className="w-full bg-[#0d1117] border border-[#1c1c1e] focus:border-[#1e3a5f] focus:outline-none p-4 rounded text-emerald-200 font-mono text-[11px] leading-relaxed resize-y whitespace-pre tab-size-4"
                      placeholder={isEmbedding ? DEFAULT_EMBEDDING_ADAPTER_PLACEHOLDER : DEFAULT_LLM_ADAPTER_PLACEHOLDER}
                      spellCheck={false}
                      style={{ tabSize: 4 } as any}
                    />
                    <p className="text-[9px] text-[#555555]">
                      Runs on backend for inference requests. The code is saved as <code className="text-[#888888] bg-black px-1 py-0.5 rounded">{'<model_id>'}.py</code>.
                    </p>
                  </div>
                </div>

                {/* ── SECTION 4: Live Adapter Testing Interface ── */}
                <div className="pt-3 border-t border-[#1c1c1e]">
                  <button
                    type="button"
                    onClick={() => setShowTestPanel(!showTestPanel)}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white font-bold transition-colors w-full"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    {isEmbedding ? "Test Embedding Adapter" : "Test Model Adapter"}
                    {showTestPanel ? <ChevronUp className="w-3 h-3 ml-auto text-[#888888]" /> : <ChevronDown className="w-3 h-3 ml-auto text-[#888888]" />}
                  </button>

                  <AnimatePresence>
                    {showTestPanel && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-black/60 border border-[#1c1c1e] rounded p-4 mt-3 space-y-3 font-mono text-xs">
                          {/* Live Editor Status Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#0c121c] border border-cyan-950/40 rounded text-[10px]">
                            <div className="flex items-center gap-1.5 text-cyan-300">
                              <Sparkles className="w-3 h-3 text-cyan-400" />
                              <span>Live Code: <strong className="text-white">{formAdapterCode.trim().length} chars</strong></span>
                            </div>
                            <div className="text-[#888888]">
                              Auth: <span className="text-white font-semibold">{formApiKey ? "Form Key" : (editingModel?.modelApiKeyMasked ? "Saved DB Key" : "Local / None")}</span>
                            </div>
                          </div>

                          {isEmbedding ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2 space-y-1">
                                  <label className="text-[9px] text-[#888888] uppercase tracking-wider">Test Text Input</label>
                                  <input
                                    type="text"
                                    value={testInputText}
                                    onChange={(e) => setTestInputText(e.target.value)}
                                    className="w-full bg-[#0d1117] border border-[#2c2c2e] focus:border-white focus:outline-none p-2 rounded text-white text-xs"
                                    placeholder="Enter text to embed..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-[#888888] uppercase tracking-wider">Input Type</label>
                                  <select
                                    value={testInputType}
                                    onChange={(e: any) => setTestInputType(e.target.value)}
                                    className="w-full bg-[#0d1117] border border-[#2c2c2e] focus:border-white focus:outline-none p-2 rounded text-white text-xs"
                                  >
                                    <option value="query">query</option>
                                    <option value="passage">passage</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleRunAdapterTest}
                                  disabled={isTestingAdapter}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                >
                                  {isTestingAdapter ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                  Run Embedding Test
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <button
                                type="button"
                                onClick={handleRunAdapterTest}
                                disabled={isTestingAdapter}
                                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
                              >
                                {isTestingAdapter ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                Run Inference Test
                              </button>
                            </div>
                          )}

                          {testResult && (
                            <div className="p-3 bg-[#0d1117] border border-emerald-900/40 rounded text-emerald-300 text-xs space-y-1.5">
                              <div className="flex items-center gap-1.5 font-bold uppercase text-[9px] text-emerald-400">
                                <CheckCircle className="w-3.5 h-3.5" /> Test Successful
                              </div>
                              {isEmbedding ? (
                                <div>
                                  <p className="text-[#888888] text-[10px]">
                                    Vectors: {testResult.count} • Dimension: <span className="text-white font-bold">{testResult.dimensions} dims</span>
                                  </p>
                                  <p className="text-[10px] text-[#aaa] font-mono truncate mt-1">
                                    Vector Sample: {JSON.stringify(testResult.embeddings?.[0]?.slice?.(0, 6))}...
                                  </p>
                                </div>
                              ) : (
                                <p className="text-white font-sans text-xs">{testResult.response_text}</p>
                              )}
                            </div>
                          )}

                          {testError && (
                            <div className="p-3 bg-red-950/40 border border-red-800/40 rounded text-red-300 text-xs">
                              <strong>Execution Error:</strong> {testError}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── SECTION 5: Advanced / Metadata (collapsible) ── */}
                <div className="pt-3 border-t border-[#1c1c1e]">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#888888] hover:text-white font-bold transition-colors w-full"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Advanced Metadata
                    {showAdvancedFields ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                  </button>

                  <AnimatePresence>
                    {showAdvancedFields && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                              Model Type
                            </label>
                            <select
                              id="form-model-type"
                              value={formType}
                              onChange={(e: any) => setFormType(e.target.value)}
                              className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white font-mono"
                            >
                              <option value="text">Text Instruction / Reasoning</option>
                              <option value="embedding">Dense Semantic Embedding</option>
                              <option value="vision">Vision Understanding</option>
                              <option value="image">Image Diffusion / Generation</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                                Context
                              </label>
                              <input
                                id="form-model-context"
                                type="number"
                                value={formContext}
                                onChange={(e) => setFormContext(parseInt(e.target.value))}
                                className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                                Scale/Params
                              </label>
                              <input
                                id="form-model-params"
                                type="text"
                                value={formParams}
                                onChange={(e) => setFormParams(e.target.value)}
                                placeholder="e.g. 1B, 8B"
                                className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                              VRAM Needed (GB)
                            </label>
                            <input
                              id="form-model-vram"
                              type="number"
                              step="0.1"
                              value={formVram}
                              onChange={(e) => setFormVram(parseFloat(e.target.value))}
                              className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                              RPM Limit
                            </label>
                            <input
                              id="form-model-rpm"
                              type="number"
                              value={formRpm}
                              onChange={(e) => setFormRpm(parseInt(e.target.value))}
                              className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                              Avg Latency (ms)
                            </label>
                            <input
                              id="form-model-latency"
                              type="number"
                              value={formLatency}
                              onChange={(e) => setFormLatency(parseInt(e.target.value))}
                              className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white font-mono"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {formError && (
                  <div className="bg-rose-500/5 border border-rose-500/20 p-3 rounded text-rose-300 text-[11px]">
                    <strong>Model configuration error:</strong> {formError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1c1c1e]">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 border border-[#1c1c1e] bg-transparent text-[#888888] hover:text-white rounded transition-colors text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    id="form-model-submit"
                    type="submit"
                    className="px-5 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 rounded transition-colors shadow-sm"
                  >
                    {editingModel ? "Apply Modifications" : isEmbedding ? "Deploy Embedding Model" : "Deploy Model"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
