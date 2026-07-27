import React, { useState, useEffect } from "react";
import {
  Activity,
  Cpu,
  Database,
  History,
  Key,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Play,
  Sliders,
  Terminal,
  TrendingUp,
  Server,
  Sparkles,
  GitMerge,
  Menu,
  X
} from "lucide-react";

// Types
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
  SystemSettings,
  Message
} from "./types";

// Mock Data
import {
  initialSystemStatus,
  initialModels,
  initialSessions,
  initialApiLogs,
  initialMemoryNodes,
  initialMemoryLogs,
  initialSources,
  initialWorkflows,
  initialBenchmarks,
  initialLogs,
  initialSettings
} from "./data";

// Components
import Dashboard from "./components/Dashboard";
import Playground from "./components/Playground";
import ApiExplorer from "./components/ApiExplorer";
import ModelsComponent from "./components/Models";
import SessionsComponent from "./components/Sessions";
import MemoryComponent from "./components/Memory";
import KnowledgeComponent from "./components/Knowledge";
import OrchestratorComponent from "./components/Orchestrator";
import BenchmarksComponent from "./components/Benchmarks";
import LogsComponent from "./components/Logs";
import SettingsComponent from "./components/Settings";

// API Client
import {
  modelsApi,
  sessionsApi,
  knowledgeApi,
  workflowsApi,
  memoryApi,
  monitoringApi,
  settingsApi,
  logsApi,
  benchmarksApi
} from "./api/client";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Core App states persisted across session
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(initialSystemStatus);
  const [models, setModels] = useState<Model[]>(() => {
    const saved = localStorage.getItem("om_models");
    return saved ? JSON.parse(saved) : initialModels;
  });
  const [sessions, setSessions] = useState<PlaygroundSession[]>(() => {
    const saved = localStorage.getItem("om_sessions");
    return saved ? JSON.parse(saved) : initialSessions;
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const saved = localStorage.getItem("om_active_session");
    return saved || initialSessions[0]?.id || "";
  });
  const [apiLogs, setApiLogs] = useState<ApiRequestLog[]>(() => {
    const saved = localStorage.getItem("om_api_logs");
    return saved ? JSON.parse(saved) : initialApiLogs;
  });
  const [memoryNodes, setMemoryNodes] = useState<MemoryNode[]>(() => {
    const saved = localStorage.getItem("om_memory_nodes");
    return saved ? JSON.parse(saved) : initialMemoryNodes;
  });
  const [memoryLogs, setMemoryLogs] = useState<MemoryLog[]>(() => {
    const saved = localStorage.getItem("om_memory_logs");
    return saved ? JSON.parse(saved) : initialMemoryLogs;
  });
  const [sources, setSources] = useState<IngestedSource[]>(() => {
    const saved = localStorage.getItem("om_sources");
    return saved ? JSON.parse(saved) : initialSources;
  });
  const [workflows, setWorkflows] = useState<Workflow[]>(() => {
    const saved = localStorage.getItem("om_workflows");
    return saved ? JSON.parse(saved) : initialWorkflows;
  });
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>(() => {
    const saved = localStorage.getItem("om_benchmarks");
    return saved ? JSON.parse(saved) : initialBenchmarks;
  });
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem("om_logs");
    return saved ? JSON.parse(saved) : initialLogs;
  });
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem("om_settings");
    return saved ? JSON.parse(saved) : initialSettings;
  });

  // Load data from backend API on mount
  useEffect(() => {
    async function loadBackendData() {
      try {
        const mRes = await modelsApi.list();
        if (mRes && Array.isArray(mRes.models) && mRes.models.length > 0) {
          setModels(mRes.models);
        }
      } catch (e) {
        console.log("Backend models load fallback to local", e);
      }

      try {
        const sRes = await sessionsApi.list();
        if (sRes && Array.isArray(sRes.sessions) && sRes.sessions.length > 0) {
          const normalized = await Promise.all(
            sRes.sessions.map(async (s: any) => {
              let msgs = s.messages;
              if (!Array.isArray(msgs)) {
                try {
                  msgs = await sessionsApi.getMessages(s.id);
                } catch {
                  msgs = [];
                }
              }
              const formattedMsgs = (Array.isArray(msgs) ? msgs : []).map((m: any) => ({
                id: m.id || "m_" + Math.random(),
                role: m.role || "user",
                content: m.content || "",
                timestamp: m.created_at || m.timestamp || new Date().toLocaleTimeString()
              }));
              const meta = s.metadata || {};
              return {
                id: s.id,
                title: s.title || "Untitled Session",
                modelId: s.modelId || s.model_id || meta.model_id || "llama3-8b-instruct",
                temperature: s.temperature ?? meta.temperature ?? 0.7,
                maxTokens: s.maxTokens ?? s.max_tokens ?? meta.max_tokens ?? 1024,
                topP: s.topP ?? s.top_p ?? meta.top_p ?? 0.9,
                presencePenalty: s.presencePenalty ?? s.presence_penalty ?? meta.presence_penalty ?? 0.0,
                jsonMode: s.jsonMode ?? s.json_mode ?? meta.json_mode ?? false,
                createdAt: s.created_at || s.createdAt || new Date().toISOString(),
                messages: formattedMsgs
              };
            })
          );
          setSessions(normalized);
        }
      } catch (e) {
        console.log("Backend sessions load fallback to local", e);
      }

      try {
        const kRes = await knowledgeApi.list();
        if (Array.isArray(kRes) && kRes.length > 0) setSources(kRes);
      } catch (e) {
        console.log("Backend knowledge load fallback to local", e);
      }

      try {
        const wRes = await workflowsApi.list();
        if (Array.isArray(wRes) && wRes.length > 0) setWorkflows(wRes);
      } catch (e) {
        console.log("Backend workflows load fallback to local", e);
      }

      try {
        const memNodes = await memoryApi.listNodes();
        if (Array.isArray(memNodes) && memNodes.length > 0) setMemoryNodes(memNodes);
      } catch (e) {
        console.log("Backend memory nodes load fallback to local", e);
      }

      try {
        const memLogs = await memoryApi.listLogs();
        if (Array.isArray(memLogs) && memLogs.length > 0) setMemoryLogs(memLogs);
      } catch (e) {
        console.log("Backend memory logs load fallback to local", e);
      }

      try {
        const bRes = await benchmarksApi.list();
        if (Array.isArray(bRes) && bRes.length > 0) setBenchmarks(bRes);
      } catch (e) {
        console.log("Backend benchmarks load fallback to local", e);
      }

      try {
        const lRes = await logsApi.system();
        if (Array.isArray(lRes) && lRes.length > 0) setLogs(lRes);
      } catch (e) {
        console.log("Backend logs load fallback to local", e);
      }

      try {
        const mon = await monitoringApi.getStatus();
        if (mon && mon.status) {
          setSystemStatus((prev) => ({
            ...prev,
            health: mon.status === "healthy" ? "Healthy" : "Degraded",
            uptime: mon.uptime || prev.uptime,
            version: mon.version || prev.version,
            cpuUsage: mon.cpu?.usage_percent || prev.cpuUsage,
            ramUsed: mon.memory?.used_gb || prev.ramUsed,
            ramTotal: mon.memory?.total_gb || prev.ramTotal,
          }));
        }
      } catch (e) {
        console.log("Backend status load fallback to local", e);
      }
    }
    loadBackendData();
  }, []);

  // Keep localStorage up to date
  useEffect(() => {
    localStorage.setItem("om_models", JSON.stringify(models));
  }, [models]);

  useEffect(() => {
    localStorage.setItem("om_sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("om_active_session", activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem("om_api_logs", JSON.stringify(apiLogs));
  }, [apiLogs]);

  useEffect(() => {
    localStorage.setItem("om_memory_nodes", JSON.stringify(memoryNodes));
  }, [memoryNodes]);

  useEffect(() => {
    localStorage.setItem("om_memory_logs", JSON.stringify(memoryLogs));
  }, [memoryLogs]);

  useEffect(() => {
    localStorage.setItem("om_sources", JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem("om_workflows", JSON.stringify(workflows));
  }, [workflows]);

  useEffect(() => {
    localStorage.setItem("om_benchmarks", JSON.stringify(benchmarks));
  }, [benchmarks]);

  useEffect(() => {
    localStorage.setItem("om_logs", JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem("om_settings", JSON.stringify(settings));
  }, [settings]);

  // Handle addition, editing, and deletion across states
  const handleAddModel = (newModel: Model) => {
    setModels([newModel, ...models]);
    // Log deployment
    handleAddLogEntry("MODEL_INFRA", `Successfully loaded and partition-mapped model: ${newModel.name}`, "INFO");
    // Append to benchmarks comparison
    setBenchmarks([
      ...benchmarks,
      {
        modelId: newModel.id,
        modelName: newModel.name,
        ttftMs: 40,
        tps: 60,
        latencyMs: newModel.latencyMs,
        accuracy: 85,
        vramGb: newModel.vramRequiredGb,
        costPer1k: 0
      }
    ]);
  };

  const handleUpdateModel = (updatedModel: Model) => {
    setModels(models.map((m) => (m.id === updatedModel.id ? updatedModel : m)));
    handleAddLogEntry("MODEL_INFRA", `Re-allocated weights and parameters for: ${updatedModel.name}`, "INFO");
  };

  const handleDeleteModel = (id: string) => {
    const target = models.find((m) => m.id === id);
    setModels(models.filter((m) => m.id !== id));
    setBenchmarks(benchmarks.filter((b) => b.modelId !== id));
    if (target) {
      handleAddLogEntry("MODEL_INFRA", `Deallocated VRAM and tore down model partition: ${target.name}`, "WARN");
    }
  };

  const handleCreateSession = (modelId: string) => {
    const newId = "sess_" + Date.now();
    const newSess: PlaygroundSession = {
      id: newId,
      title: "Workspace Session #" + (sessions.length + 1),
      modelId,
      temperature: 0.7,
      maxTokens: 1024,
      topP: 0.9,
      presencePenalty: 0.1,
      jsonMode: false,
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      messages: [
        {
          id: "sys_" + Date.now(),
          role: "system",
          content: "You are a helpful assistant.",
          timestamp: new Date().toLocaleTimeString()
        }
      ]
    };
    setSessions([newSess, ...sessions]);
    setActiveSessionId(newId);
    handleAddLogEntry("CORE_VM", `Created new playground workspace state: '${newSess.title}'`, "INFO");
  };

  const handleDeleteSession = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (id === activeSessionId && updated.length > 0) {
      setActiveSessionId(updated[0].id);
    }
    if (target) {
      handleAddLogEntry("CORE_VM", `Purged workspace conversation history: '${target.title}'`, "WARN");
    }
  };

  const handleUpdateSessionMessages = (sessionId: string, newMessages: Message[]) => {
    setSessions(
      sessions.map((s) => (s.id === sessionId ? { ...s, messages: newMessages } : s))
    );
  };

  const handleUpdateSessionParams = (sessionId: string, params: any) => {
    setSessions(
      sessions.map((s) => (s.id === sessionId ? { ...s, ...params } : s))
    );
  };

  const handleAddApiLog = (newLog: ApiRequestLog) => {
    setApiLogs([newLog, ...apiLogs]);
    handleAddLogEntry(
      "API_GATEWAY",
      `Incoming client request to '${newLog.url.replace("https://api.openmind.ai", "")}' returned code ${newLog.status} in ${newLog.timeMs}ms.`,
      newLog.status >= 400 ? "ERROR" : "INFO"
    );
  };

  const handleClearApiLogs = () => {
    setApiLogs([]);
    handleAddLogEntry("API_GATEWAY", "Cleared internal request logger history.", "INFO");
  };

  const handleAddSource = (newSrc: IngestedSource) => {
    setSources([newSrc, ...sources]);
    handleAddLogEntry("INGEST_PIPE", `Indexed document '${newSrc.name}' and registered embeddings.`, "INFO");

    // Add to memory nodes automatically
    const newNode: MemoryNode = {
      id: "mem_" + Date.now(),
      label: newSrc.name.replace(/\.[^/.]+$/, ""),
      tier: "Semantic",
      category: "Document",
      timestamp: new Date().toLocaleTimeString(),
      value: `Dense vectors indexed from document. Chunk size: ${newSrc.chunksCount}`,
      connections: []
    };
    setMemoryNodes([newNode, ...memoryNodes]);
  };

  const handleDeleteSource = (id: string) => {
    const target = sources.find((s) => s.id === id);
    setSources(sources.filter((s) => s.id !== id));
    if (target) {
      handleAddLogEntry("INGEST_PIPE", `Tore down index vectors for document: '${target.name}'`, "WARN");
    }
  };

  const handleAddWorkflow = (newWf: Workflow) => {
    setWorkflows([newWf, ...workflows]);
    handleAddLogEntry("ORCHESTRATOR", `Registered multi-agent orchestrator template: '${newWf.name}'`, "INFO");
  };

  const handleUpdateWorkflow = (updatedWf: Workflow) => {
    setWorkflows(workflows.map((w) => (w.id === updatedWf.id ? updatedWf : w)));
    handleAddLogEntry("ORCHESTRATOR", `Updated template instructions for: '${updatedWf.name}'`, "INFO");
  };

  const handleDeleteWorkflow = (id: string) => {
    const target = workflows.find((w) => w.id === id);
    setWorkflows(workflows.filter((w) => w.id !== id));
    if (target) {
      handleAddLogEntry("ORCHESTRATOR", `Deleted orchestration workflow layout: '${target.name}'`, "WARN");
    }
  };

  const handleAddLogEntry = (source: string, message: string, severity: "INFO" | "WARN" | "ERROR") => {
    const newEntry: LogEntry = {
      id: "l_" + Date.now(),
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 23),
      severity,
      source,
      message
    };
    setLogs((prev) => [...prev, newEntry]);
  };

  const handleTriggerReplay = (log: LogEntry) => {
    handleAddLogEntry(
      "ORCHESTRATOR",
      `Triggering hot replay for component event from '${log.source}' - message details: '${log.message}'`,
      "INFO"
    );
    alert(`Replay event launched for log entry. Execution logged to system tail.`);
  };

  const handleQuickAction = (action: string) => {
    if (action === "add-model") {
      setActiveTab("models");
    } else if (action === "ingest-docs") {
      setActiveTab("knowledge");
    } else if (action === "trigger-workflow") {
      setActiveTab("orchestrator");
    }
  };

  // Navigations links matching sidebar layout
  const navLinks = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "playground", label: "Playground", icon: Sliders },
    { id: "api", label: "API Explorer", icon: Terminal },
    { id: "models", label: "Models", icon: Cpu },
    { id: "sessions", label: "Sessions", icon: MessageSquare },
    { id: "memory", label: "Memory", icon: GitMerge },
    { id: "knowledge", label: "Knowledge", icon: Database },
    { id: "orchestrator", label: "Orchestrator", icon: Activity },
    { id: "benchmarks", label: "Benchmarks", icon: TrendingUp },
    { id: "logs", label: "Logs", icon: History },
    { id: "settings", label: "Settings", icon: Server }
  ];

  // Dynamic Theme Preset configurations
  const themeStyles = {
    "Slate Dark": "bg-gray-950 text-gray-100 font-sans",
    "Midnight Blue": "bg-slate-950 text-slate-100 font-sans",
    "Cyberpunk Light": "bg-zinc-50 text-zinc-900 font-sans",
    "Emerald Minimal": "bg-emerald-950 text-gray-100 font-sans",
    "Sophisticated Dark": "bg-[#0d0d0f] text-[#e0e0e0] font-sans"
  }[settings.theme] || "bg-gray-950 text-gray-100 font-sans";

  const sidebarBgClass = {
    "Cyberpunk Light": "bg-zinc-100 border-zinc-200 text-gray-800",
    "Sophisticated Dark": "bg-[#0a0a0b] border-[#1c1c1e] text-[#888888]",
    "Slate Dark": "bg-gray-950 border-gray-900 text-gray-400",
    "Midnight Blue": "bg-slate-950 border-slate-900 text-slate-400",
    "Emerald Minimal": "bg-emerald-950 border-emerald-900 text-gray-400"
  }[settings.theme] || "bg-gray-950 border-gray-900 text-gray-400";

  const headerBgClass = {
    "Cyberpunk Light": "bg-white border-zinc-200",
    "Sophisticated Dark": "bg-[#0a0a0b] border-[#1c1c1e]",
    "Slate Dark": "bg-gray-950/20 border-gray-900",
    "Midnight Blue": "bg-slate-950/20 border-slate-900",
    "Emerald Minimal": "bg-emerald-950/20 border-emerald-900"
  }[settings.theme] || "bg-gray-950/20 border-gray-900";

  return (
    <div className={`min-h-screen flex ${themeStyles}`}>
      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r transition-transform md:translate-x-0 ${sidebarBgClass} ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`flex h-16 items-center justify-between px-6 border-b ${settings.theme === "Sophisticated Dark" ? "border-[#1c1c1e]" : "border-gray-900"} bg-gray-950/20`}>
          <div className="flex items-center gap-2.5">
            {settings.theme === "Sophisticated Dark" ? (
              <div className="w-7 h-7 bg-gradient-to-br from-[#4a4a4a] to-[#1a1a1a] border border-[#3a3a3a] flex items-center justify-center rounded-sm">
                <span className="text-white font-serif text-sm">α</span>
              </div>
            ) : (
              <Sparkles className="w-5 h-5 text-sky-500 animate-pulse" />
            )}
            <span className={`text-sm font-bold tracking-tight text-gray-100 uppercase ${settings.theme === "Sophisticated Dark" ? "font-serif tracking-[0.15em]" : "font-sans"}`}>
              {settings.theme === "Sophisticated Dark" ? "ANTIGRAVITY" : "OpenMind AI"}
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Link navigation container */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto max-h-[calc(100vh-70px)]">
          {settings.theme === "Sophisticated Dark" && (
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#555] mb-4 px-3 font-semibold font-sans">
              Core Modules
            </p>
          )}
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isSelected = activeTab === link.id;

            return (
              <button
                key={link.id}
                id={`nav-${link.id}`}
                onClick={() => {
                  setActiveTab(link.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-semibold text-left transition-all ${
                  isSelected
                    ? settings.theme === "Sophisticated Dark"
                      ? "bg-[#161618] text-white border border-[#2c2c2e] shadow-sm font-medium"
                      : "bg-sky-600 text-white shadow-md shadow-sky-500/10 scale-102"
                    : settings.theme === "Cyberpunk Light"
                    ? "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200"
                    : settings.theme === "Sophisticated Dark"
                    ? "text-[#888888] hover:text-white hover:bg-[#161618]/30 border border-transparent"
                    : "text-gray-400 hover:text-gray-100 hover:bg-gray-900/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? (settings.theme === "Sophisticated Dark" ? "text-white" : "text-white") : "text-gray-500"}`} />
                <span className={settings.theme === "Sophisticated Dark" ? "font-sans" : ""}>{link.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen overflow-hidden">
        {/* Top Header Row bar */}
        <header className={`h-16 border-b flex items-center justify-between px-6 ${headerBgClass} bg-gray-950/20 backdrop-blur-sm relative z-30`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 hover:bg-gray-900/40 rounded-lg transition-colors text-gray-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-mono text-gray-500 font-bold uppercase select-none hidden sm:block">
              SYSTEM: {systemStatus.health} • UPTIME: {systemStatus.uptime}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${
              settings.theme === "Sophisticated Dark"
                ? "bg-[#111113]/80 border-[#1c1c1e] text-[#aaa]"
                : "bg-gray-950/60 border-gray-900 text-gray-400"
            }`}>
              <Cpu className={`w-3.5 h-3.5 ${settings.theme === "Sophisticated Dark" ? "text-white" : "text-sky-400"}`} />
              <span>VRAM Partition: {models.filter(m => (m.status === "Deployed" || (m as any).available)).reduce((acc, m) => acc + ((m as any).vramRequiredGb ?? (m as any).vram_required_gb ?? 0), 0).toFixed(1)} / {systemStatus.vramTotal} GB</span>
            </div>
          </div>
        </header>

        {/* View Frame Router */}
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-64px)] relative z-20">
          {activeTab === "dashboard" && (
            <Dashboard
              status={systemStatus}
              logs={logs}
              models={models}
              sources={sources}
              workflows={workflows}
              onNavigate={setActiveTab}
              onQuickAction={handleQuickAction}
            />
          )}

          {activeTab === "playground" && (
            <Playground
              sessions={sessions}
              models={models}
              activeSessionId={activeSessionId}
              onSelectSession={setActiveSessionId}
              onCreateSession={handleCreateSession}
              onDeleteSession={handleDeleteSession}
              onUpdateSessionMessages={handleUpdateSessionMessages}
              onUpdateSessionParams={handleUpdateSessionParams}
            />
          )}

          {activeTab === "api" && (
            <ApiExplorer logs={apiLogs} onAddLog={handleAddApiLog} onClearLogs={handleClearApiLogs} />
          )}

          {activeTab === "models" && (
            <ModelsComponent
              models={models}
              onAddModel={handleAddModel}
              onUpdateModel={handleUpdateModel}
              onDeleteModel={handleDeleteModel}
              vramUsed={models.filter(m => (m.status === "Deployed" || (m as any).available)).reduce((acc, m) => acc + ((m as any).vramRequiredGb ?? (m as any).vram_required_gb ?? 0), 0)}
              vramTotal={systemStatus.vramTotal}
            />
          )}

          {activeTab === "sessions" && (
            <SessionsComponent
              sessions={sessions}
              models={models}
              onSelectSession={setActiveSessionId}
              onDeleteSession={handleDeleteSession}
              onCreateSession={handleCreateSession}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "memory" && (
            <MemoryComponent
              nodes={memoryNodes}
              logs={memoryLogs}
              onAddNode={(n) => setMemoryNodes([n, ...memoryNodes])}
              onAddLog={(l) => setMemoryLogs([l, ...memoryLogs])}
            />
          )}

          {activeTab === "knowledge" && (
            <KnowledgeComponent sources={sources} onAddSource={handleAddSource} onDeleteSource={handleDeleteSource} />
          )}

          {activeTab === "orchestrator" && (
            <OrchestratorComponent
              workflows={workflows}
              onAddWorkflow={handleAddWorkflow}
              onUpdateWorkflow={handleUpdateWorkflow}
              onDeleteWorkflow={handleDeleteWorkflow}
            />
          )}

          {activeTab === "benchmarks" && <BenchmarksComponent benchmarks={benchmarks} />}

          {activeTab === "logs" && <LogsComponent logs={logs} onTriggerReplay={handleTriggerReplay} />}

          {activeTab === "settings" && (
            <SettingsComponent settings={settings} models={models} onUpdateSettings={setSettings} />
          )}
        </main>
      </div>
    </div>
  );
}
