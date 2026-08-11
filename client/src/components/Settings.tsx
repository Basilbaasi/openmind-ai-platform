import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings,
  Key,
  Shield,
  Palette,
  Server,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Github,
  Globe,
  Sliders,
  HelpCircle,
  Database
} from "lucide-react";
import { SystemSettings, ApiKey, Model } from "../types";

interface SettingsProps {
  settings: SystemSettings;
  models: Model[];
  onUpdateSettings: (settings: SystemSettings) => void;
}

export default function SettingsComponent({
  settings,
  models,
  onUpdateSettings
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<"general" | "api" | "provider" | "security" | "appearance">("general");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // General Settings inputs
  const [name, setName] = useState(settings.generalName);
  const [desc, setDesc] = useState(settings.generalDesc);
  const [github, setGithub] = useState(settings.githubUrl);
  const [fallbackModel, setFallbackModel] = useState(settings.fallbackModelId);
  const [sessionTimeout, setSessionTimeout] = useState(settings.sessionTimeoutMin);

  // API Token inputs
  const [newTokenName, setNewTokenName] = useState("");

  // Appearance inputs
  const [theme, setTheme] = useState(settings.theme);

  const handleApplyChanges = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateSettings({
      ...settings,
      generalName: name,
      generalDesc: desc,
      githubUrl: github,
      fallbackModelId: fallbackModel,
      sessionTimeoutMin: sessionTimeout,
      theme
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleGenerateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    const randomPrefix = "om_" + Math.random().toString(36).substring(2, 7) + "_prod_";
    const newKey: ApiKey = {
      id: "key_" + Date.now(),
      name: newTokenName,
      keyPrefix: randomPrefix,
      createdAt: new Date().toISOString().slice(0, 10),
      lastUsed: "Never"
    };

    onUpdateSettings({
      ...settings,
      apiKeys: [...settings.apiKeys, newKey]
    });

    setNewTokenName("");
  };

  const handleDeleteToken = (id: string) => {
    onUpdateSettings({
      ...settings,
      apiKeys: settings.apiKeys.filter((k) => k.id !== id)
    });
  };

  const handleToggleProvider = (prov: string) => {
    const isCurrentlyActive = settings.activeProviders.includes(prov);
    const updated = isCurrentlyActive
      ? settings.activeProviders.filter((p) => p !== prov)
      : [...settings.activeProviders, prov];

    onUpdateSettings({
      ...settings,
      activeProviders: updated
    });
  };

  return (
    <div id="settings-view" className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
      {/* Left Sidebar: Settings Navigation Tabs */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 flex flex-col gap-1.5 h-full">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 px-3">
          Configuration Categories
        </h2>

        <button
          onClick={() => setActiveTab("general")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-colors ${
            activeTab === "general"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/15"
              : "text-gray-400 hover:text-gray-250 hover:bg-gray-950/40 border border-transparent"
          }`}
        >
          <Settings className="w-4 h-4" /> General System
        </button>

        <button
          id="tab-api-management"
          onClick={() => setActiveTab("api")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-colors ${
            activeTab === "api"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/15"
              : "text-gray-400 hover:text-gray-250 hover:bg-gray-950/40 border border-transparent"
          }`}
        >
          <Key className="w-4 h-4" /> API Token management
        </button>

        <button
          onClick={() => setActiveTab("provider")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-colors ${
            activeTab === "provider"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/15"
              : "text-gray-400 hover:text-gray-250 hover:bg-gray-950/40 border border-transparent"
          }`}
        >
          <Server className="w-4 h-4" /> Provider Configurations
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-colors ${
            activeTab === "security"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/15"
              : "text-gray-400 hover:text-gray-250 hover:bg-gray-950/40 border border-transparent"
          }`}
        >
          <Shield className="w-4 h-4" /> Security & RBAC Roles
        </button>

        <button
          onClick={() => setActiveTab("appearance")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-colors ${
            activeTab === "appearance"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/15"
              : "text-gray-400 hover:text-gray-250 hover:bg-gray-950/40 border border-transparent"
          }`}
        >
          <Palette className="w-4 h-4" /> Visual Appearance
        </button>
      </div>

      {/* Main Settings Form panel */}
      <div className="lg:col-span-3 bg-gray-900/30 border border-gray-800 rounded-xl p-6 flex flex-col justify-between h-full overflow-y-auto">
        <div className="flex-1">
          {/* General category tab */}
          {activeTab === "general" && (
            <div className="space-y-5 text-xs">
              <div>
                <h3 className="text-sm font-bold text-gray-200">General System Configurations</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Configure main global cluster details.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">
                    Platform Cluster Label
                  </label>
                  <input
                    id="settings-general-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-850 focus:border-sky-500 focus:outline-none p-2.5 rounded-lg text-gray-250"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">
                    GitHub Synchronization repository URL
                  </label>
                  <div className="flex items-center bg-gray-950 border border-gray-850 rounded-lg overflow-hidden focus-within:border-sky-500">
                    <span className="p-2.5 bg-gray-900/50 text-gray-500">
                      <Github className="w-4 h-4" />
                    </span>
                    <input
                      id="settings-github-url"
                      type="text"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      className="bg-transparent p-2.5 w-full focus:outline-none text-gray-250 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">
                  Cluster System Description
                </label>
                <textarea
                  id="settings-general-desc"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-950 border border-gray-850 focus:border-sky-500 focus:outline-none p-2.5 rounded-lg text-gray-250 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">
                    Fallback Router Model
                  </label>
                  <select
                    id="settings-fallback-model"
                    value={fallbackModel}
                    onChange={(e) => setFallbackModel(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-850 focus:outline-none focus:border-sky-500 p-2.5 rounded-lg text-gray-300"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">
                    Workspace Inactivity Timeout (minutes)
                  </label>
                  <input
                    id="settings-session-timeout"
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(parseInt(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-850 focus:outline-none focus:border-sky-500 p-2.5 rounded-lg text-gray-250"
                  />
                </div>
              </div>
            </div>
          )}

          {/* API management category tab */}
          {activeTab === "api" && (
            <div className="space-y-5 text-xs">
              <div>
                <h3 className="text-sm font-bold text-gray-250">API Bearer token Keys</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Manage authentication prefixes required to submit requests through the API Gateway.
                </p>
              </div>

              {/* Generate form */}
              <form onSubmit={handleGenerateToken} className="flex gap-2 bg-gray-950/40 border border-gray-850 p-4 rounded-xl items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-bold">
                    New Token Identifier Name
                  </label>
                  <input
                    id="new-token-name"
                    type="text"
                    placeholder="e.g. Analytics Webhook Token"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-850 focus:outline-none focus:border-sky-500 p-2.5 rounded-lg text-gray-300"
                  />
                </div>
                <button
                  id="generate-token-btn"
                  type="submit"
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-1 text-xs"
                >
                  <Plus className="w-4 h-4" /> Generate Token
                </button>
              </form>

              {/* Keys list table */}
              <div className="bg-gray-950 border border-gray-850 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="border-b border-gray-850 font-mono text-[9px] uppercase tracking-wider text-gray-500 bg-gray-950/60 p-4">
                      <th className="p-4">Key Name</th>
                      <th className="p-4">Prefix</th>
                      <th className="p-4">Created</th>
                      <th className="p-4">Last Used</th>
                      <th className="p-4 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.apiKeys.map((k) => (
                      <tr key={k.id} className="border-b border-gray-850 hover:bg-gray-900/10 text-gray-300">
                        <td className="p-4 font-semibold">{k.name}</td>
                        <td className="p-4 font-mono text-sky-400 text-[10px]">{k.keyPrefix}••••••••</td>
                        <td className="p-4 font-mono text-[10px] text-gray-400">{k.createdAt}</td>
                        <td className="p-4 font-mono text-[10px] text-gray-400">{k.lastUsed}</td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteToken(k.id)}
                            className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Provider configurations category tab */}
          {activeTab === "provider" && (
            <div className="space-y-5 text-xs">
              <div>
                <h3 className="text-sm font-bold text-gray-250">Physical Infrastructure Drivers</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Toggle drivers for local execution vs cloud gateway routes.</p>
              </div>

              <div className="space-y-4">
                {/* Local Partition */}
                <div className="flex items-center justify-between p-4 bg-gray-950/40 border border-gray-850 rounded-xl">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-gray-200 block">Local exLlama GGUF Driver</span>
                    <span className="text-xs text-gray-400 leading-normal block max-w-md">
                      Allows execution of .gguf weights directly using localized CUDA kernels, utilizing local RTX hardware.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleProvider("Local")}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors focus:outline-none ${
                      settings.activeProviders.includes("Local") ? "bg-sky-600" : "bg-gray-800"
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                        settings.activeProviders.includes("Local") ? "translate-x-4.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Cloud Gateway APIs */}
                <div className="flex items-center justify-between p-4 bg-gray-950/40 border border-gray-850 rounded-xl">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-gray-200 block">Cloud API Proxy Gateway</span>
                    <span className="text-xs text-gray-400 leading-normal block max-w-md">
                      Enables multi-turn external fallback queries to configured cloud model providers.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleProvider("Cloud")}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors focus:outline-none ${
                      settings.activeProviders.includes("Cloud") ? "bg-sky-600" : "bg-gray-800"
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                        settings.activeProviders.includes("Cloud") ? "translate-x-4.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security category tab */}
          {activeTab === "security" && (
            <div className="space-y-5 text-xs">
              <div>
                <h3 className="text-sm font-bold text-gray-250">Role-Based Access Control (RBAC)</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Declare and lock down operator vs administrator operational constraints.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-950/30 border border-gray-850 rounded-xl space-y-3">
                  <h4 className="font-semibold text-gray-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-sky-400" /> Administrative Permissions (Full)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-gray-400">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked disabled className="accent-sky-500" />
                      Model Partition Deletion
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked disabled className="accent-sky-500" />
                      Key Generation & Rotation
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked disabled className="accent-sky-500" />
                      Ingestion Pipeline Management
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked disabled className="accent-sky-500" />
                      Workflow Execution Triggering
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-gray-950/30 border border-gray-850 rounded-xl space-y-3">
                  <h4 className="font-semibold text-gray-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-purple-400" /> Operator Permissions (ReadOnly / Workspace)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-gray-400">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked disabled className="accent-purple-500" />
                      Playground Prompt Queries
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked disabled className="accent-purple-500" />
                      Semantic Memory Inspection
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked disabled className="accent-purple-500" />
                      API Explorer Workbench testing
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked disabled className="accent-purple-500" />
                      Consolidated Benchmark Exports
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance tab */}
          {activeTab === "appearance" && (
            <div className="space-y-5 text-xs">
              <div>
                <h3 className="text-sm font-bold text-gray-250">Visual Theme Configuration</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Toggle between premium high-contrast developer palettes.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "Sophisticated Dark", desc: "Sleek pitch-black layout with serif typography and minimal borders.", color: "bg-[#0a0a0b] border-[#1c1c1e]" },
                  { name: "Slate Dark", desc: "A soft slate off-white/gray developer tone.", color: "bg-slate-900 border-slate-700" },
                  { name: "Midnight Blue", desc: "Deep cosmic slate with electric indigo accents.", color: "bg-indigo-950 border-indigo-850" },
                  { name: "Cyberpunk Light", desc: "High-contrast clean neon workspace.", color: "bg-zinc-100 border-zinc-200 text-gray-900" },
                  { name: "Emerald Minimal", desc: "Soothing dark forest canvas.", color: "bg-emerald-950 border-emerald-900" }
                ].map((preset) => {
                  const isSelected = theme === preset.name;

                  return (
                    <div
                      key={preset.name}
                      onClick={() => setTheme(preset.name as any)}
                      className={`p-4 border rounded-xl cursor-pointer hover:border-sky-500/50 transition-all ${
                        isSelected
                          ? "bg-sky-500/10 border-sky-500/40 text-sky-300"
                          : "bg-gray-950/60 border-gray-850 text-gray-400"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg border ${preset.color}`} />
                        <div>
                          <span className="text-xs font-bold text-gray-200">{preset.name}</span>
                          <span className="text-[10px] text-gray-500 block mt-0.5 leading-normal">{preset.desc}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Global Save Controls */}
        <div className="flex justify-end items-center gap-3 border-t border-gray-850/60 pt-4 mt-6">
          <AnimatePresence>
            {saveSuccess && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs font-mono"
              >
                <CheckCircle className="w-4 h-4" /> Parameters Applied Successfully!
              </motion.span>
            )}
          </AnimatePresence>

          <button
            id="settings-apply-btn"
            onClick={() => handleApplyChanges()}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Apply Configurations
          </button>
        </div>
      </div>
    </div>
  );
}
