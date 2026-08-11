import React, { useState } from "react";
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
  ClipboardCheck
} from "lucide-react";
import { Model } from "../types";

interface ModelsProps {
  models: Model[];
  onAddModel: (model: Model) => Promise<void>;
  onUpdateModel: (model: Model) => Promise<void>;
  onDeleteModel: (id: string) => void;
  vramUsed: number;
  vramTotal: number;
}

const DEFAULT_ADAPTER_PLACEHOLDER = `# NVIDIA / OpenAI-compatible adapter.
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

const PROVIDER_ADAPTER_PROMPT = `Transform the provider's Python chat-completions example below into executable Python adapter code for OpenMind. Return exactly one fenced Python code block and no explanation. Use normal Python indentation: every block after if/for/try/else must use four leading spaces. I will copy only the code inside the fence into the adapter editor.

These runtime variables already exist. Do not define or overwrite them:
api_key (str), messages (full ordered chat history), user_message (latest message), temperature (float), max_tokens (int), top_p (float), stream (bool controlled by the platform).

Requirements:
1. Preserve the provider endpoint, model ID, provider-specific payload fields, and required headers.
2. Replace literal keys or environment placeholders with api_key. Never include a real key.
3. Use "messages": messages. Do not hard-code messages, an empty message list, or user_message in its place.
4. Use temperature, max_tokens, and top_p when the provider supports them.
5. Never assign stream. Use "stream": stream in the payload and requests.post(..., stream=stream).
6. For stream=True, request text/event-stream where applicable; call response.raise_for_status(); iterate response.iter_lines(chunk_size=1, decode_unicode=True); print every non-empty raw SSE line.
7. For stream=False, assign the final visible answer string to response_text. Do not print provider JSON as the response.
8. The returned code must pass Python syntax validation.

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

  // Form State — Basic Info
  const [formName, setFormName] = useState("");
  const [formProvider, setFormProvider] = useState<"Local" | "Cloud" | "Custom">("Cloud");
  const [formType, setFormType] = useState<"text" | "image" | "embedding" | "vision">("text");
  const [formContext, setFormContext] = useState(8192);
  const [formParams, setFormParams] = useState("8B");
  const [formLatency, setFormLatency] = useState(30);
  const [formVram, setFormVram] = useState(0);
  const [formRpm, setFormRpm] = useState(1000);
  const [formDesc, setFormDesc] = useState("");

  // Form State — Schema (NEW)
  const [formApiKey, setFormApiKey] = useState("");
  const [formAdapterCode, setFormAdapterCode] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showVariableRef, setShowVariableRef] = useState(true);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const copyProviderPrompt = async () => {
    await navigator.clipboard.writeText(PROVIDER_ADAPTER_PROMPT);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 1800);
  };

  const handleOpenAdd = () => {
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
    setFormApiKey("");
    setFormAdapterCode("");
    setShowApiKey(false);
    setFormError(null);
    setShowVariableRef(true);
    setShowAdvancedFields(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (model: Model) => {
    setEditingModel(model);
    setFormName(model.name);
    setFormProvider(model.provider);
    setFormType(model.type);
    setFormContext(model.contextWindow);
    setFormParams(model.parameters);
    setFormLatency(model.latencyMs);
    setFormVram(model.vramRequiredGb);
    setFormRpm(model.rpmLimit);
    setFormDesc(model.description);
    setFormApiKey(model.modelApiKey || "");
    setFormAdapterCode(model.adapterCode || "");
    setShowApiKey(false);
    setFormError(null);
    setShowVariableRef(false);
    setShowAdvancedFields(true);
    setIsFormOpen(true);
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
        adapterCode: formAdapterCode,
        modelApiKey: formApiKey || editingModel.modelApiKey
        });
      } else {
        await onAddModel({
        id: "model_" + Date.now(),
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

          <button
            id="deploy-model-btn"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-white text-black text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-200 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Deploy Model
          </button>
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

                    <p className="text-xs text-[#888888] leading-normal line-clamp-2 mt-2">
                      {model.description}
                    </p>

                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#1c1c1e] text-center font-mono">
                      <div className="p-1.5 bg-black rounded border border-[#1c1c1e]/60">
                        <span className="text-[8px] text-[#555555] block uppercase tracking-wider">VRAM Required</span>
                        <span className="text-[11px] font-bold text-white mt-0.5 block">
                          {model.vramRequiredGb > 0 ? `${model.vramRequiredGb} GB` : "Cloud"}
                        </span>
                      </div>
                      <div className="p-1.5 bg-black rounded border border-[#1c1c1e]/60">
                        <span className="text-[8px] text-[#555555] block uppercase tracking-wider">RPM Limit</span>
                        <span className="text-[11px] font-bold text-white mt-0.5 block">{model.rpmLimit}</span>
                      </div>
                      <div className="p-1.5 bg-black rounded border border-[#1c1c1e]/60">
                        <span className="text-[8px] text-[#555555] block uppercase tracking-wider">Avg Latency</span>
                        <span className="text-[11px] font-bold text-white mt-0.5 block">{model.latencyMs} ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1c1c1e]">
                    <span className="flex items-center gap-1.5 text-xs text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[10px] uppercase font-mono tracking-wider text-[#888888]">{model.status}</span>
                    </span>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(model)}
                        className="p-1.5 bg-black text-[#888888] hover:text-white hover:bg-[#161618] border border-[#1c1c1e] rounded transition-colors"
                        title="Configure Model"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteModel(model.id)}
                        className="p-1.5 bg-black text-[#888888] hover:text-white hover:bg-[#161618] border border-[#1c1c1e] rounded transition-colors"
                        title="Teardown Model"
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

        {/* Resources Panel */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded-lg h-fit space-y-6">
          <div>
            <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-white flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-white" />
              Infrastructure Allocation
            </h3>
            <p className="text-[11px] text-[#888888] mt-1.5 leading-normal">
              Active physical local GPU memory partitions.
            </p>
          </div>

          <div className="space-y-4">
            {/* GPU Memory Meter */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#888888] font-bold uppercase text-[9px] tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-white" /> VRAM Allocation
                </span>
                <span className="font-mono text-white text-[11px]">
                  {vramUsed} / {vramTotal} GB
                </span>
              </div>
              <div className="w-full bg-[#1c1c1e] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-white h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(vramUsed / vramTotal) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#555555] font-mono">
                <span>Free: {(vramTotal - vramUsed).toFixed(1)} GB</span>
                <span>{( (vramUsed / vramTotal) * 100 ).toFixed(0)}% Util</span>
              </div>
            </div>

            {/* RAM Meter */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#888888] font-bold uppercase text-[9px] tracking-wider flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-white" /> System Host RAM
                </span>
                <span className="font-mono text-white text-[11px]">22.8 / 64 GB</span>
              </div>
              <div className="w-full bg-[#1c1c1e] h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-1.5 rounded-full" style={{ width: "35.6%" }} />
              </div>
              <div className="flex justify-between text-[9px] text-[#555555] font-mono">
                <span>Free: 41.2 GB</span>
                <span>35% Util</span>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-[#1c1c1e] p-3.5 rounded text-[11px] leading-relaxed text-[#888888] flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-white" />
            <p>
              Local GGUF quantized weights are mapped instantly to memory partitions using unified drivers.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DEPLOY / CONFIGURE MODEL FORM DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsFormOpen(false)} />

            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-[#0a0a0b] border border-[#1c1c1e] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-lg shadow-2xl relative z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1e] mb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white">
                  {editingModel ? "Configure Model" : "Deploy New Model"}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 hover:text-white text-[#555555] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                {/* ── SECTION 1: Basic Info ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white font-bold">
                    <Cpu className="w-3.5 h-3.5" /> Basic Information
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                        Model Name *
                      </label>
                      <input
                        id="form-model-name"
                        type="text"
                        placeholder="e.g. NVIDIA Ising 1.5 31B"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full bg-black border border-[#1c1c1e] focus:border-white focus:outline-none p-2.5 rounded text-white"
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
                        <option value="Local">Local Partition (GGUF/ExLlama)</option>
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
                      placeholder="Describe the model's purpose and capabilities..."
                    />
                  </div>
                </div>

                {/* ── SECTION 2: API Key ── */}
                <div className="space-y-3 pt-3 border-t border-[#1c1c1e]">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white font-bold">
                    <Key className="w-3.5 h-3.5" /> Provider API Key
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                      API Key {editingModel?.modelApiKeyMasked && <span className="text-[#555555] normal-case tracking-normal">(current: {editingModel.modelApiKeyMasked})</span>}
                    </label>
                    <div className="relative">
                      <input
                        id="form-model-api-key"
                        type={showApiKey ? "text" : "password"}
                        placeholder={editingModel ? "Leave blank to keep existing key" : "Enter your provider API key..."}
                        value={formApiKey}
                        onChange={(e) => setFormApiKey(e.target.value)}
                        className="w-full bg-black border border-[#1c1c1e] focus:border-white focus:outline-none p-2.5 pr-10 rounded text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-2.5 text-[#555555] hover:text-white transition-colors"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[9px] text-[#555555] mt-1">
                      This key is stored per-model and injected as <code className="text-[#888888] bg-black px-1 py-0.5 rounded">api_key</code> in your adapter code.
                    </p>
                  </div>
                </div>

                {/* ── SECTION 3: Provider Code ── */}
                <div className="space-y-3 pt-3 border-t border-[#1c1c1e]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white font-bold">
                      <Code className="w-3.5 h-3.5" /> Provider Adapter Code
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

                  <div className="bg-[#111113] border border-[#1e3a5f]/40 rounded p-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <p className="text-[10px] text-[#aab4ca] leading-relaxed">
                      Copy a prompt for ChatGPT, paste the provider example into it, then copy only the properly indented Python code from its response below.
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setFormAdapterCode(DEFAULT_ADAPTER_PLACEHOLDER)}
                        className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider border border-[#2c2c2e] text-[#c7d2fe] hover:text-white rounded"
                      >
                        Use NVIDIA Template
                      </button>
                      <button
                        type="button"
                        onClick={copyProviderPrompt}
                        className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider bg-white text-black hover:bg-neutral-200 rounded flex items-center gap-1"
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
                            Variable Reference — Use these exact names in your code
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* Input Variables */}
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
                                  <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded border border-[#1c1c1e] whitespace-nowrap">top_p</code>
                                  <span className="text-[#888888]">→ float</span>
                                </div>
                                <div className="flex gap-2">
                                  <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded border border-[#1c1c1e] whitespace-nowrap">stream</code>
                                  <span className="text-[#888888]">→ bool, platform-controlled</span>
                                </div>
                              </div>
                            </div>

                            {/* Output Variable */}
                            <div className="space-y-2">
                              <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">
                                ▸ Output Variable (Optional)
                              </p>
                              <div className="font-mono text-[10px] space-y-1">
                                <div className="flex gap-2">
                                  <code className="text-rose-300 bg-black px-1.5 py-0.5 rounded border border-rose-900/30 whitespace-nowrap">response_text</code>
                                  <span className="text-[#888888]">→ str — Model's reply</span>
                                </div>
                              </div>
                              <p className="text-[9px] text-[#888888] leading-relaxed mt-1">
                                <span className="text-emerald-400 font-bold">Auto-Parse Fallback:</span> If <code className="text-[#aaa] bg-black px-1 rounded">response_text</code> is not set, the backend will auto-extract from a <code className="text-[#aaa] bg-black px-1 rounded">response</code> object or capture printed JSON (e.g., <code className="text-[#aaa] bg-black px-1 rounded">print(response.json())</code>).
                              </p>

                              <p className="text-[9px] font-bold text-[#888888] uppercase tracking-wider mt-3">
                                ▸ Pre-imported Modules
                              </p>
                              <div className="font-mono text-[10px] text-[#888888] space-y-0.5">
                                <div><code className="text-[#aaa]">requests</code>, <code className="text-[#aaa]">base64</code>, <code className="text-[#aaa]">json</code></div>
                              </div>

                              <div className="mt-3 p-2 bg-black/50 border border-[#1c1c1e] rounded text-[9px] text-[#888888] leading-relaxed">
                                <span className="text-amber-400">Important:</span> Do not assign <code>stream = False</code> or hard-code API keys/messages. Use <code>"stream": stream</code> and <code>"messages": messages</code> in the provider payload.
                              </div>
                            </div>
                          </div>
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
                      rows={16}
                      className="w-full bg-[#0d1117] border border-[#1c1c1e] focus:border-[#1e3a5f] focus:outline-none p-4 rounded text-emerald-200 font-mono text-[11px] leading-relaxed resize-y whitespace-pre tab-size-4"
                      placeholder={DEFAULT_ADAPTER_PLACEHOLDER}
                      spellCheck={false}
                      style={{ tabSize: 4 } as any}
                    />
                    <p className="text-[9px] text-[#555555]">
                      This code runs on the backend server for each chat request. Use the standardized variable names above.
                      The code file is saved as <code className="text-[#888888] bg-black px-1 py-0.5 rounded">{'<model_id>'}.py</code> on the server.
                    </p>
                  </div>
                </div>

                {/* ── SECTION 4: Advanced / Metadata (collapsible) ── */}
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
                              className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white"
                            >
                              <option value="text">Text Instruction / Reasoning</option>
                              <option value="vision">Vision Understanding</option>
                              <option value="embedding">Dense Semantic Embedding</option>
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
                                className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white"
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
                                placeholder="e.g. 7B"
                                className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white"
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
                              className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white"
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
                              className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white"
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
                              className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {formProvider === "Local" && formVram > (vramTotal - vramUsed) && !editingModel && (
                  <div className="bg-amber-500/5 border border-amber-500/15 p-3 rounded text-amber-400 flex items-start gap-2 leading-relaxed text-[11px]">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                    <p>
                      Warning: Requested VRAM ({formVram} GB) exceeds remaining local capacity (
                      {(vramTotal - vramUsed).toFixed(1)} GB). Allocating this may degrade existing model outputs.
                    </p>
                  </div>
                )}

                {!formAdapterCode.trim() && (
                  <div className="bg-blue-500/5 border border-blue-500/15 p-3 rounded text-blue-300 flex items-start gap-2 leading-relaxed text-[11px]">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                    <p>
                      No adapter code provided. This model won't be able to generate responses until you add provider code.
                    </p>
                  </div>
                )}

                {formError && (
                  <div className="bg-rose-500/5 border border-rose-500/20 p-3 rounded text-rose-300 text-[11px]">
                    <strong>Model configuration error:</strong> {formError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1c1c1e]">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 border border-[#1c1c1e] bg-transparent text-[#888888] hover:text-white rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="form-model-submit"
                    type="submit"
                    className="px-5 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 rounded transition-colors"
                  >
                    {editingModel ? "Apply Modifications" : "Deploy Model"}
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
