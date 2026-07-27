import React from "react";
import { motion } from "motion/react";
import {
  Activity,
  Cpu,
  Layers,
  Database,
  Terminal,
  Server,
  Play,
  Upload,
  PlusCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { SystemStatus, LogEntry, Model, IngestedSource, Workflow } from "../types";

interface DashboardProps {
  status: SystemStatus;
  logs: LogEntry[];
  models: Model[];
  sources: IngestedSource[];
  workflows: Workflow[];
  onNavigate: (tab: string) => void;
  onQuickAction: (action: string) => void;
}

export default function Dashboard({
  status,
  logs,
  models,
  sources,
  workflows,
  onNavigate,
  onQuickAction
}: DashboardProps) {
  const deployedModelsCount = models.filter((m) => m.status === "Deployed").length;
  const indexedSourcesCount = sources.filter((s) => s.status === "Indexed").length;
  const activeWorkflowsCount = workflows.filter((w) => w.status === "Active").length;

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Top Welcome Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0a0a0b] border border-[#1c1c1e] p-6 rounded-lg gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif italic text-white tracking-wide flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            OpenMind AI Mission Control
          </h1>
          <p className="text-xs text-[#888888] font-sans mt-1.5 uppercase tracking-wider">
            Dynamic routing, multi-agent orchestrations, and local model infrastructure overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 text-[10px] font-mono bg-[#111113] border border-[#1c1c1e] text-[#888888] tracking-wider rounded">
            ENV: PRODUCTION
          </span>
          <span className="px-3 py-1 text-[10px] font-mono bg-white text-black border border-white tracking-wider rounded font-bold uppercase flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            {status.health}
          </span>
        </div>
      </div>

      {/* Grid of Key Resource Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111113] border border-[#1c1c1e] p-5 rounded-lg hover:border-[#2c2c2e] transition-colors"
        >
          <div className="flex items-center justify-between text-[#888888] mb-2">
            <span className="text-[10px] font-sans font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-white" />
              Core CPU Util
            </span>
            <span className="text-[10px] font-mono text-[#555555]">Host Core</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif text-white">{status.cpuUsage}%</span>
            <span className="text-[10px] text-[#888888] font-mono uppercase tracking-wider">Normal</span>
          </div>
          <div className="w-full bg-[#1c1c1e] h-1 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-white h-1 rounded-full transition-all duration-500"
              style={{ width: `${status.cpuUsage}%` }}
            />
          </div>
        </motion.div>

        {/* GPU Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#111113] border border-[#1c1c1e] p-5 rounded-lg hover:border-[#2c2c2e] transition-colors"
        >
          <div className="flex items-center justify-between text-[#888888] mb-2">
            <span className="text-[10px] font-sans font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-white" />
              GPU Load (Active)
            </span>
            <span className="text-[10px] font-mono text-[#555555]">RTX 4090 x1</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif text-white">{status.gpuUsage}%</span>
            <span className="text-[10px] text-[#888888] font-mono uppercase tracking-wider">Optimized</span>
          </div>
          <div className="w-full bg-[#1c1c1e] h-1 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-white h-1 rounded-full transition-all duration-500"
              style={{ width: `${status.gpuUsage}%` }}
            />
          </div>
        </motion.div>

        {/* VRAM Utilization */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#111113] border border-[#1c1c1e] p-5 rounded-lg hover:border-[#2c2c2e] transition-colors"
        >
          <div className="flex items-center justify-between text-[#888888] mb-2">
            <span className="text-[10px] font-sans font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-white" />
              Allocated VRAM
            </span>
            <span className="text-[10px] font-mono text-[#555555]">Local Cache</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif text-white">
              {status.vramUsed} <span className="text-xs text-[#555555]">/ {status.vramTotal} GB</span>
            </span>
            <span className="text-[10px] text-[#888888] font-mono uppercase tracking-wider">64% Capacity</span>
          </div>
          <div className="w-full bg-[#1c1c1e] h-1 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-white h-1 rounded-full transition-all duration-500"
              style={{ width: `${(status.vramUsed / status.vramTotal) * 100}%` }}
            />
          </div>
        </motion.div>

        {/* System Uptime */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#111113] border border-[#1c1c1e] p-5 rounded-lg hover:border-[#2c2c2e] transition-colors"
        >
          <div className="flex items-center justify-between text-[#888888] mb-2">
            <span className="text-[10px] font-sans font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Server className="w-4 h-4 text-white" />
              Deployment Health
            </span>
            <span className="text-[10px] font-mono text-[#555555]">Uptime</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-serif text-white">{status.uptime}</span>
          </div>
          <p className="text-[10px] text-[#555555] mt-4 flex items-center gap-1 font-mono uppercase tracking-wider">
            Version: {status.version}
          </p>
        </motion.div>
      </div>

      {/* Main split: Left is Core Stats & Actions, Right is Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111113] border border-[#1c1c1e] p-4 rounded-lg flex items-center gap-4">
              <div className="p-3 rounded bg-[#161618] border border-[#2c2c2e] text-white">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-[#888888] font-sans uppercase tracking-wider font-semibold">Deployed Models</p>
                <p className="text-lg font-serif font-bold text-white mt-0.5">{deployedModelsCount} Active</p>
              </div>
            </div>
            <div className="bg-[#111113] border border-[#1c1c1e] p-4 rounded-lg flex items-center gap-4">
              <div className="p-3 rounded bg-[#161618] border border-[#2c2c2e] text-white">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-[#888888] font-sans uppercase tracking-wider font-semibold">Knowledge Base</p>
                <p className="text-lg font-serif font-bold text-white mt-0.5">{indexedSourcesCount} Sources</p>
              </div>
            </div>
            <div className="bg-[#111113] border border-[#1c1c1e] p-4 rounded-lg flex items-center gap-4">
              <div className="p-3 rounded bg-[#161618] border border-[#2c2c2e] text-white">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-[#888888] font-sans uppercase tracking-wider font-semibold">Active Agents</p>
                <p className="text-lg font-serif font-bold text-white mt-0.5">{activeWorkflowsCount} Bots</p>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-[#111113] border border-[#1c1c1e] p-6 rounded-lg">
            <h3 className="text-xs font-sans font-bold uppercase tracking-[0.15em] text-white mb-4">
              Rapid System Operations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                id="quick-add-model"
                onClick={() => onQuickAction("add-model")}
                className="group flex flex-col items-start p-5 bg-[#0a0a0b] border border-[#1c1c1e] hover:border-white/30 hover:bg-[#161618] text-left rounded transition-all"
              >
                <div className="p-2 bg-white/5 border border-[#1c1c1e] text-white rounded mb-3 transition-colors">
                  <PlusCircle className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-white">Deploy Model</span>
                <span className="text-[11px] text-[#888888] mt-1.5 leading-normal">
                  Add local GGUF/HF weights or set custom endpoint details.
                </span>
              </button>

              <button
                id="quick-ingest-doc"
                onClick={() => onQuickAction("ingest-docs")}
                className="group flex flex-col items-start p-5 bg-[#0a0a0b] border border-[#1c1c1e] hover:border-white/30 hover:bg-[#161618] text-left rounded transition-all"
              >
                <div className="p-2 bg-white/5 border border-[#1c1c1e] text-white rounded mb-3 transition-colors">
                  <Upload className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-white">Ingest Knowledge</span>
                <span className="text-[11px] text-[#888888] mt-1.5 leading-normal">
                  Process docs, chunk automatically, and update semantic embeddings.
                </span>
              </button>

              <button
                id="quick-run-bot"
                onClick={() => onQuickAction("trigger-workflow")}
                className="group flex flex-col items-start p-5 bg-[#0a0a0b] border border-[#1c1c1e] hover:border-white/30 hover:bg-[#161618] text-left rounded transition-all"
              >
                <div className="p-2 bg-white/5 border border-[#1c1c1e] text-white rounded mb-3 transition-colors">
                  <Play className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-white">Trigger Agent</span>
                <span className="text-[11px] text-[#888888] mt-1.5 leading-normal">
                  Initiate one of the custom orchestrated workflow pipelines.
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity Log Tail */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded-lg flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1c1c1e]">
            <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-white flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-white animate-pulse" />
              Platform Event Tail
            </h3>
            <button
              onClick={() => onNavigate("logs")}
              className="text-[10px] uppercase font-bold tracking-wider text-white hover:underline font-sans"
            >
              Expand
            </button>
          </div>

          <div className="space-y-3 flex-1 max-h-[360px] overflow-y-auto pr-1">
            {logs.slice(0, 6).map((log) => {
              const severityColors = {
                INFO: "bg-white/5 text-white border-white/10",
                WARN: "bg-amber-500/5 text-amber-400 border-amber-500/10",
                ERROR: "bg-rose-500/5 text-rose-400 border-rose-500/10"
              };

              return (
                <div
                  key={log.id}
                  className="p-3 bg-[#0a0a0b] border border-[#1c1c1e] rounded hover:border-[#2c2c2e] transition-colors text-xs"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-[#555555] font-mono">
                      {log.timestamp.split(" ")[1] || log.timestamp}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest border ${
                        severityColors[log.severity]
                      }`}
                    >
                      {log.severity}
                    </span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="font-mono text-[#888888] font-bold uppercase tracking-tight mr-1 text-[10px]">
                      [{log.source}]
                    </span>
                    <span className="text-[#cccccc] font-sans leading-relaxed break-all">
                      {log.message}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
