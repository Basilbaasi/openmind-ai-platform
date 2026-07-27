import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GitMerge,
  Search,
  Database,
  Layers,
  Activity,
  History,
  Check,
  AlertCircle,
  HelpCircle,
  Clock,
  Compass,
  ArrowRight
} from "lucide-react";
import { MemoryNode, MemoryLog } from "../types";

interface MemoryProps {
  nodes: MemoryNode[];
  logs: MemoryLog[];
  onAddNode: (node: MemoryNode) => void;
  onAddLog: (log: MemoryLog) => void;
}

export default function Memory({
  nodes,
  logs,
  onAddNode,
  onAddLog
}: MemoryProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodes[0]?.id || "");
  const [semanticQuery, setSemanticQuery] = useState("");
  const [searchResult, setSearchResult] = useState<MemoryNode | null>(null);
  const [tierFilter, setTierFilter] = useState<"All" | "Conversation" | "Semantic" | "Long-Term">("All");

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const handleQuerySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semanticQuery.trim()) return;

    // Simulate dense embedding cosine lookup
    const queryLower = semanticQuery.toLowerCase();
    const matches = nodes.map((n) => {
      let score = 0;
      if (n.label.toLowerCase().includes(queryLower)) score += 0.5;
      if (n.value.toLowerCase().includes(queryLower)) score += 0.4;
      if (n.category.toLowerCase().includes(queryLower)) score += 0.1;
      return { node: n, score };
    });

    const bestMatch = matches.sort((a, b) => b.score - a.score)[0];

    if (bestMatch && bestMatch.score > 0) {
      setSearchResult(bestMatch.node);
      setSelectedNodeId(bestMatch.node.id);

      // Write query log
      onAddLog({
        id: "mlog_" + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        tier: "Semantic",
        operation: "Read",
        text: `Query similarity match for '${semanticQuery}' resolved to node '${bestMatch.node.label}' with confidence score: ${(0.7 + bestMatch.score * 0.2).toFixed(2)}`
      });
    } else {
      setSearchResult(null);
    }
  };

  const filteredNodes = nodes.filter(
    (n) => tierFilter === "All" || n.tier === tierFilter
  );

  return (
    <div id="memory-subsystem-view" className="space-y-6">
      {/* Top memory tiers overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Short Term */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-white" />
              Conversation Memory
            </span>
            <span className="text-[8px] font-mono bg-white/5 border border-white/10 text-white px-1.5 rounded uppercase font-bold">
              L1 Tier
            </span>
          </div>
          <p className="text-2xl font-sans font-bold text-white">
            {nodes.filter((n) => n.tier === "Conversation").length} <span className="text-xs text-[#888888]">Nodes</span>
          </p>
          <p className="text-[11px] text-[#888888] mt-2 leading-relaxed">
            Stops session context windows from overflowing by saving dynamic local chat embeddings.
          </p>
        </div>

        {/* Semantic Partition */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-white" />
              Semantic Core
            </span>
            <span className="text-[8px] font-mono bg-white/5 border border-white/10 text-white px-1.5 rounded uppercase font-bold">
              L2 Tier
            </span>
          </div>
          <p className="text-2xl font-sans font-bold text-white">
            {nodes.filter((n) => n.tier === "Semantic").length} <span className="text-xs text-[#888888]">Nodes</span>
          </p>
          <p className="text-[11px] text-[#888888] mt-2 leading-relaxed">
            Cross-session index of dense vectors, triggered automatically during context matches.
          </p>
        </div>

        {/* Long Term */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-white" />
              Long-Term Storage
            </span>
            <span className="text-[8px] font-mono bg-white/5 border border-white/10 text-white px-1.5 rounded uppercase font-bold">
              L3 Tier
            </span>
          </div>
          <p className="text-2xl font-sans font-bold text-white">
            {nodes.filter((n) => n.tier === "Long-Term").length} <span className="text-xs text-[#888888]">Nodes</span>
          </p>
          <p className="text-[11px] text-[#888888] mt-2 leading-relaxed">
            Highly compressed facts and structured system heuristics consolidated during idle GPU loads.
          </p>
        </div>
      </div>

      {/* Main Row split: Vector Graph SVG Canvas on left, inspector on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive SVG Canvas */}
        <div className="lg:col-span-2 bg-[#111113] border border-[#1c1c1e] p-5 rounded flex flex-col h-[460px] overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h3 className="text-[10px] font-sans font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <GitMerge className="w-4 h-4 text-white" />
                Memory Association Space
              </h3>
              <p className="text-[10px] text-[#888888] mt-0.5">
                Polished vector clusters. Click a node to inspect or query connections.
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {["All", "Conversation", "Semantic", "Long-Term"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTierFilter(t as any)}
                  className={`px-2.5 py-1 text-[9px] font-mono uppercase font-bold rounded transition-colors ${
                    tierFilter === t
                      ? "bg-white text-black"
                      : "bg-black text-[#888888] hover:text-white border border-[#1c1c1e]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive SVG Node Diagram Box */}
          <div className="flex-1 bg-black border border-[#1c1c1e] rounded relative flex items-center justify-center overflow-hidden animate-fade-in">
            {/* Vector Connections Background SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="16"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#ffffff" opacity="0.3" />
                </marker>
              </defs>

              {/* Draw connected lines */}
              {nodes
                .filter((node) => {
                  const visibleIds = filteredNodes.map((fn) => fn.id);
                  return visibleIds.includes(node.id);
                })
                .map((node, i) => {
                  // Coordinate generators
                  const angle = (i / nodes.length) * Math.PI * 2;
                  const fromX = 240 + Math.cos(angle) * 140;
                  const fromY = 180 + Math.sin(angle) * 110;

                  return node.connections.map((targetId) => {
                    const targetIndex = nodes.findIndex((n) => n.id === targetId);
                    if (targetIndex === -1) return null;

                    const targetAngle = (targetIndex / nodes.length) * Math.PI * 2;
                    const toX = 240 + Math.cos(targetAngle) * 140;
                    const toY = 180 + Math.sin(targetAngle) * 110;

                    const isHighlighted = node.id === selectedNodeId || targetId === selectedNodeId;

                    return (
                      <line
                        key={`${node.id}-${targetId}`}
                        x1={fromX}
                        y1={fromY}
                        x2={toX}
                        y2={toY}
                        stroke={isHighlighted ? "#ffffff" : "#333333"}
                        strokeWidth={isHighlighted ? "1.5" : "0.75"}
                        opacity={isHighlighted ? "0.6" : "0.15"}
                        markerEnd="url(#arrow)"
                      />
                    );
                  });
                })}
            </svg>

            {/* Clickable Nodes overlay */}
            <div className="absolute inset-0">
              {nodes.map((node, i) => {
                const isSelected = node.id === selectedNodeId;
                const matchesFilter = tierFilter === "All" || node.tier === tierFilter;

                if (!matchesFilter) return null;

                const angle = (i / nodes.length) * Math.PI * 2;
                const x = 240 + Math.cos(angle) * 140;
                const y = 180 + Math.sin(angle) * 110;

                const tierColors = {
                  Conversation: "bg-white border-neutral-300",
                  Semantic: "bg-white border-neutral-500",
                  "Long-Term": "bg-white border-neutral-700"
                }[node.tier] || "bg-white border-neutral-400";

                return (
                  <button
                    key={node.id}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      setSearchResult(null);
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-transform hover:scale-105"
                    style={{ left: `${x}px`, top: `${y}px` }}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border shadow-lg transition-all ${tierColors} ${
                        isSelected
                          ? "scale-125 ring-4 ring-white/20 border-white bg-white"
                          : "opacity-80 hover:opacity-100"
                      }`}
                    />
                    <span
                      className={`mt-1.5 px-2 py-0.5 rounded text-[8px] font-mono font-bold shadow-sm whitespace-nowrap bg-black/90 border transition-all uppercase tracking-wider ${
                        isSelected ? "border-white text-white" : "border-[#1c1c1e] text-[#888888]"
                      }`}
                    >
                      {node.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Semantic Search & Node Inspector */}
        <div className="space-y-6">
          {/* Query workbench */}
          <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded space-y-3">
            <div>
              <h3 className="text-[10px] font-sans font-bold uppercase tracking-wider text-white">
                Semantic Embed Query
              </h3>
              <p className="text-[10px] text-[#888888] mt-0.5">
                Simulate dense embedding search vectors within local partitions.
              </p>
            </div>

            <form onSubmit={handleQuerySearch} className="flex gap-2">
              <input
                id="semantic-query-input"
                type="text"
                placeholder="Search semantic space... e.g. SQL"
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                className="flex-1 bg-black text-xs border border-[#1c1c1e] hover:border-[#2c2c2e] focus:border-white focus:outline-none rounded p-2 text-white font-sans"
              />
              <button
                id="semantic-query-btn"
                type="submit"
                className="px-3 bg-white text-black hover:bg-[#e5e5e5] rounded flex items-center justify-center transition-colors"
              >
                <Search className="w-4 h-4 text-black" />
              </button>
            </form>

            {searchResult && (
              <div className="p-3 bg-white/5 border border-white/10 rounded text-white text-[10px] leading-relaxed flex items-start gap-2 font-mono">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-white" />
                <div>
                  <p className="font-bold uppercase tracking-wider">Match Found! Similarity Confirmed</p>
                  <p className="text-[#888888] mt-0.5">Matched label: "{searchResult.label.toUpperCase()}"</p>
                </div>
              </div>
            )}
          </div>

          {/* Node details viewer */}
          {selectedNode && (
            <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c1c1e] pb-2">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-white">
                  Node Inspector
                </span>
                <span className="text-[8px] font-mono text-[#555555] font-bold uppercase">
                  ID: {selectedNode.id}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[9px] font-mono text-[#555555] uppercase font-bold tracking-wider">Node Label</span>
                  <p className="text-xs font-bold text-white mt-0.5">{selectedNode.label}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-mono text-[#555555] uppercase font-bold tracking-wider">Memory Tier</span>
                    <p className="text-xs text-[#cccccc] font-medium mt-0.5">{selectedNode.tier}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-[#555555] uppercase font-bold tracking-wider">Category Group</span>
                    <p className="text-xs text-[#cccccc] font-medium mt-0.5">{selectedNode.category}</p>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-mono text-[#555555] uppercase font-bold tracking-wider">Metadata Value</span>
                  <p className="text-xs text-[#cccccc] bg-black p-2.5 rounded border border-[#1c1c1e] font-sans mt-1 leading-normal">
                    {selectedNode.value}
                  </p>
                </div>

                {selectedNode.connections.length > 0 && (
                  <div>
                    <span className="text-[9px] font-mono text-[#555555] uppercase font-bold block mb-1 tracking-wider">
                      Active Associations ({selectedNode.connections.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNode.connections.map((targetId) => {
                        const target = nodes.find((n) => n.id === targetId);
                        if (!target) return null;
                        return (
                          <span
                            key={targetId}
                            onClick={() => setSelectedNodeId(targetId)}
                            className="text-[9px] font-mono bg-white/5 hover:bg-white hover:text-black transition-all text-white px-2 py-0.5 rounded border border-[#1c1c1e] cursor-pointer flex items-center gap-1"
                          >
                            {target.label} <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Memory operation logs tail */}
      <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-sans font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <History className="w-4 h-4 text-white" />
            Memory Operation Logs
          </h3>
          <span className="text-[9px] font-mono text-[#555555] uppercase tracking-wider font-bold">Live background updates</span>
        </div>

        <div className="space-y-2 max-h-[220px] overflow-y-auto">
          {logs.map((log) => {
            const operationColors = {
              Write: "text-white bg-white/5 border-white/10",
              Read: "text-white bg-white/5 border-white/10",
              Prune: "text-rose-400 bg-rose-500/5 border-rose-500/10",
              Consolidate: "text-white bg-white/5 border-white/10"
            }[log.operation] || "text-[#888888]";

            return (
              <div
                key={log.id}
                className="p-2.5 bg-black border border-[#1c1c1e] rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[#555555] font-mono">{log.timestamp}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono border uppercase font-bold tracking-wider ${operationColors}`}>
                    {log.operation}
                  </span>
                  <span className="text-[#888888] font-mono text-[9px] uppercase font-bold">[{log.tier}]</span>
                </div>
                <p className="text-[#cccccc] font-sans leading-relaxed text-left flex-1 sm:pl-4">
                  {log.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
