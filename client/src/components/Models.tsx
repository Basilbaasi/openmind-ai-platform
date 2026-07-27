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
  AlertTriangle
} from "lucide-react";
import { Model } from "../types";

interface ModelsProps {
  models: Model[];
  onAddModel: (model: Model) => void;
  onUpdateModel: (model: Model) => void;
  onDeleteModel: (id: string) => void;
  vramUsed: number;
  vramTotal: number;
}

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

  // Form State
  const [formName, setFormName] = useState("");
  const [formProvider, setFormProvider] = useState<"Local" | "Cloud" | "Custom">("Local");
  const [formType, setFormType] = useState<"text" | "image" | "embedding" | "vision">("text");
  const [formContext, setFormContext] = useState(8192);
  const [formParams, setFormParams] = useState("8B");
  const [formLatency, setFormLatency] = useState(30);
  const [formVram, setFormVram] = useState(6.5);
  const [formRpm, setFormRpm] = useState(1000);
  const [formDesc, setFormDesc] = useState("");

  const handleOpenAdd = () => {
    setEditingModel(null);
    setFormName("");
    setFormProvider("Local");
    setFormType("text");
    setFormContext(8192);
    setFormParams("8B");
    setFormLatency(30);
    setFormVram(6.5);
    setFormRpm(1000);
    setFormDesc("");
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
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingModel) {
      onUpdateModel({
        ...editingModel,
        name: formName,
        provider: formProvider,
        type: formType,
        contextWindow: formContext,
        parameters: formParams,
        latencyMs: formLatency,
        vramRequiredGb: formVram,
        rpmLimit: formRpm,
        description: formDesc
      });
    } else {
      onAddModel({
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
        description: formDesc
      });
    }
    setIsFormOpen(false);
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
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-mono border font-semibold uppercase tracking-wider ${
                          typeColors[model.type] || "text-gray-400"
                        }`}
                      >
                        {model.type}
                      </span>
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

      {/* Deployment / Modification Form Dialog */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsFormOpen(false)} />

            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-[#0a0a0b] border border-[#1c1c1e] w-full max-w-lg p-6 rounded-lg shadow-2xl relative z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1e] mb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white">
                  {editingModel ? "Configure Model" : "Deploy New Model Partition"}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 hover:text-white text-[#555555] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                      Model Identifier / Name
                    </label>
                    <input
                      id="form-model-name"
                      type="text"
                      placeholder="e.g. DeepSeek R1 7B"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-black border border-[#1c1c1e] focus:border-white focus:outline-none p-2.5 rounded text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                      Infrastructure Provider
                    </label>
                    <select
                      id="form-model-provider"
                      value={formProvider}
                      onChange={(e: any) => setFormProvider(e.target.value)}
                      className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white"
                    >
                      <option value="Local">Local Partition (GGUF/ExLlama)</option>
                      <option value="Cloud">Cloud Proxy Route (Google/OpenAI)</option>
                      <option value="Custom">Custom Microservice Endpoint</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                      Model Modality / Type
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

                <div className="grid grid-cols-3 gap-4">
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

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                    Description & Allocation Scope
                  </label>
                  <textarea
                    id="form-model-desc"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-black border border-[#1c1c1e] focus:outline-none focus:border-white p-2.5 rounded text-white resize-none"
                    placeholder="Enter short details about this model's role..."
                  />
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
                    {editingModel ? "Apply Modifications" : "Deploy Partition"}
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
