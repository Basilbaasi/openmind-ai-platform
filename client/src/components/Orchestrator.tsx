import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  Edit2,
  GitMerge,
  Play,
  ArrowRight,
  Sparkles,
  Layers,
  Activity,
  AlertTriangle,
  X,
  CheckCircle
} from "lucide-react";
import { Workflow, WorkflowStep } from "../types";

interface OrchestratorProps {
  workflows: Workflow[];
  onAddWorkflow: (wf: Workflow) => void;
  onUpdateWorkflow: (wf: Workflow) => void;
  onDeleteWorkflow: (id: string) => void;
}

export default function Orchestrator({
  workflows,
  onAddWorkflow,
  onUpdateWorkflow,
  onDeleteWorkflow
}: OrchestratorProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWf, setEditingWf] = useState<Workflow | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTrigger, setFormTrigger] = useState("");
  const [formSteps, setFormSteps] = useState<WorkflowStep[]>([
    { id: "step_1", name: "Parse Input Context", type: "Condition", config: {} },
    { id: "step_2", name: "Execute LLM Logic", type: "LLM", config: { model: "llama3-8b-instruct" } }
  ]);

  const handleOpenAdd = () => {
    setEditingWf(null);
    setFormName("");
    setFormDesc("");
    setFormTrigger("API Endpoint Call");
    setFormSteps([
      { id: "step_1", name: "Parse Input Context", type: "Condition", config: {} },
      { id: "step_2", name: "Execute LLM Logic", type: "LLM", config: { model: "llama3-8b-instruct" } }
    ]);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (wf: Workflow) => {
    setEditingWf(wf);
    setFormName(wf.name);
    setFormDesc(wf.description);
    setFormTrigger(wf.trigger);
    setFormSteps([...wf.steps]);
    setIsFormOpen(true);
  };

  const handleAddStep = () => {
    const newId = "step_" + Date.now();
    setFormSteps([...formSteps, { id: newId, name: "New Integration Step", type: "LLM", config: {} }]);
  };

  const handleRemoveStep = (id: string) => {
    setFormSteps(formSteps.filter((s) => s.id !== id));
  };

  const handleStepChange = (index: number, key: "name" | "type", value: string) => {
    const updated = [...formSteps];
    updated[index] = { ...updated[index], [key]: value };
    setFormSteps(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingWf) {
      onUpdateWorkflow({
        ...editingWf,
        name: formName,
        description: formDesc,
        trigger: formTrigger,
        steps: formSteps
      });
    } else {
      onAddWorkflow({
        id: "wf_" + Date.now(),
        name: formName,
        description: formDesc,
        trigger: formTrigger,
        steps: formSteps,
        status: "Draft",
        lastRun: "Never"
      });
    }
    setIsFormOpen(false);
  };

  const handleTriggerRun = (wf: Workflow) => {
    // Simulate a background agent execution run
    alert(`Triggering orchestrated execution run for workflow: '${wf.name}'! Check background log tails.`);
  };

  return (
    <div id="orchestrator-view" className="space-y-6">
      {/* Top dashboard summary header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111113] border border-[#1c1c1e] p-6 rounded">
        <div>
          <h1 className="text-sm font-sans font-bold text-white uppercase tracking-[0.12em] flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-white" />
            Agent Orchestration Workflows
          </h1>
          <p className="text-xs text-[#888888] mt-1">
            Build server-authoritative, sequential, multi-step LLM chains and integration logic trees.
          </p>
        </div>

        <button
          id="create-workflow-btn"
          onClick={handleOpenAdd}
          className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-[11px] font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 text-black" /> Create Workflow
        </button>
      </div>

      {/* Workflows Cards and Connector Graphics */}
      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence>
          {workflows.map((wf) => (
            <motion.div
              key={wf.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-[#111113] border border-[#1c1c1e] p-6 rounded flex flex-col justify-between group transition-colors"
            >
              <div>
                {/* Header row of card */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#1c1c1e] pb-4 mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                      {wf.name}
                    </h3>
                    <p className="text-xs text-[#888888] mt-1">{wf.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-[#888888] bg-black px-2 py-0.5 border border-[#1c1c1e] rounded uppercase font-bold tracking-wider">
                      Trigger: {wf.trigger.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ${
                        wf.status === "Active"
                          ? "text-white bg-white/5 border-white/10"
                          : "text-[#888888] bg-black border-[#1c1c1e]"
                      }`}
                    >
                      {wf.status}
                    </span>
                  </div>
                </div>

                {/* Steps Visual Pipeline connectors */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-black rounded border border-[#1c1c1e] overflow-x-auto">
                  <span className="text-[9px] uppercase font-mono font-bold text-[#555555] px-2 tracking-wider">
                    Pipeline Steps:
                  </span>

                  {wf.steps.map((step, idx) => {
                    return (
                      <React.Fragment key={step.id}>
                        {idx > 0 && <ArrowRight className="w-4 h-4 text-[#333333] hidden sm:block" />}
                        <div className="p-2.5 rounded border border-[#1c1c1e] flex items-center gap-2 bg-[#111113] min-w-[140px]">
                          <span className="w-2 h-2 rounded-full bg-white opacity-80" />
                          <div>
                            <p className="text-[11px] font-bold text-white truncate">{step.name}</p>
                            <span className="text-[8px] font-mono text-[#555555] uppercase font-bold tracking-wider">{step.type}</span>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons row of card */}
              <div className="flex justify-between items-center mt-5 pt-4 border-t border-[#1c1c1e]">
                <span className="text-[9px] text-[#555555] font-mono uppercase tracking-wider font-bold">
                  Last Executed Run: {wf.lastRun.toUpperCase()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTriggerRun(wf)}
                    className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 rounded font-bold text-[9px] uppercase tracking-widest flex items-center gap-1.5 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 text-black" /> Execute Test
                  </button>
                  <button
                    onClick={() => handleOpenEdit(wf)}
                    className="p-1.5 bg-black text-[#888888] hover:text-white border border-[#1c1c1e] hover:border-[#2c2c2e] rounded transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteWorkflow(wf.id)}
                    className="p-1.5 bg-black text-[#888888] hover:text-white border border-[#1c1c1e] hover:border-[#2c2c2e] rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Creation/Modification Form Overlay */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0a0a0b] border border-[#1c1c1e] w-full max-w-2xl p-6 rounded shadow-2xl relative z-10 font-mono text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1e] mb-4">
                <h3 className="text-xs font-sans font-bold uppercase tracking-widest text-white">
                  {editingWf ? "Modify Workflow Orchestrator" : "Compose Multi-Agent Workflow"}
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
                    <label className="text-[9px] font-mono text-[#555555] uppercase tracking-wider font-bold">
                      Workflow Label
                    </label>
                    <input
                      id="form-wf-name"
                      type="text"
                      placeholder="e.g. L1 Triage Bot"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-black border border-[#1c1c1e] hover:border-[#2c2c2e] focus:border-white focus:outline-none p-2.5 rounded text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-[#555555] uppercase tracking-wider font-bold">
                      Action Pipeline Trigger
                    </label>
                    <input
                      id="form-wf-trigger"
                      type="text"
                      placeholder="e.g. Cron, Latency, API Endpoint"
                      value={formTrigger}
                      onChange={(e) => setFormTrigger(e.target.value)}
                      className="w-full bg-black border border-[#1c1c1e] hover:border-[#2c2c2e] focus:border-white focus:outline-none p-2.5 rounded text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-[#555555] uppercase tracking-wider font-bold">
                    Workflow Description
                  </label>
                  <textarea
                    id="form-wf-desc"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    rows={1.5}
                    className="w-full bg-black border border-[#1c1c1e] hover:border-[#2c2c2e] focus:outline-none focus:border-white p-2.5 rounded text-white resize-none"
                    placeholder="Short summary detailing trigger scope..."
                  />
                </div>

                {/* Steps block Builder */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-[#1c1c1e] pb-1">
                    <span className="text-[9px] font-mono text-[#555555] uppercase tracking-wider font-bold">
                      Sequential Integration Steps ({formSteps.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="text-[9px] text-white hover:underline flex items-center gap-1 font-bold uppercase tracking-wider"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Step
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {formSteps.map((step, idx) => (
                      <div
                        key={step.id}
                        className="p-3 bg-[#111113] border border-[#1c1c1e] rounded flex items-center gap-3 text-xs"
                      >
                        <span className="font-mono text-[#555555] text-[9px] font-bold">#{idx + 1}</span>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => handleStepChange(idx, "name", e.target.value)}
                          className="flex-1 bg-black text-xs border border-[#1c1c1e] hover:border-[#2c2c2e] focus:outline-none focus:border-white p-1.5 rounded text-white"
                          placeholder="Step Name"
                        />
                        <select
                          value={step.type}
                          onChange={(e) => handleStepChange(idx, "type", e.target.value as any)}
                          className="bg-black text-xs border border-[#1c1c1e] hover:border-[#2c2c2e] focus:outline-none focus:border-white p-1.5 rounded text-white"
                        >
                          <option value="LLM">LLM (Generate)</option>
                          <option value="Condition">Condition (If/Else)</option>
                          <option value="API_Call">API Call (Webhook)</option>
                          <option value="Memory_Fetch">Memory Lookup</option>
                          <option value="Human_Approval">Human Approval</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(step.id)}
                          className="text-[#555555] hover:text-white p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1c1c1e]">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 bg-black border border-[#1c1c1e] hover:border-[#2c2c2e] text-[#cccccc] hover:text-white rounded font-bold uppercase tracking-wider text-[10px]"
                  >
                    Cancel
                  </button>
                  <button
                    id="form-wf-submit"
                    type="submit"
                    className="px-4 py-2 bg-white text-black hover:bg-neutral-200 font-bold rounded uppercase tracking-wider text-[10px]"
                  >
                    {editingWf ? "Apply Operations" : "Assemble Pipeline"}
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
