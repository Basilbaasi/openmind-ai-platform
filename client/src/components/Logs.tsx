import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Terminal,
  Search,
  Filter,
  Play,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  Clock,
  Code
} from "lucide-react";
import { LogEntry } from "../types";

interface LogsProps {
  logs: LogEntry[];
  onTriggerReplay: (log: LogEntry) => void;
}

export default function Logs({ logs, onTriggerReplay }: LogsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [liveTail, setLiveTail] = useState(true);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom if Live Tail is checked
  useEffect(() => {
    if (liveTail && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, liveTail]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const handleCopyTrace = (log: LogEntry) => {
    const textToCopy = log.metadata?.error_trace || JSON.stringify(log.metadata || {}, null, 2);
    navigator.clipboard.writeText(textToCopy);
    alert("Metadata Trace copied to clipboard!");
  };

  // Extract unique sources in logs
  const sources = ["ALL", ...Array.from(new Set(logs.map((l) => l.source)))];

  const filteredLogs = logs.filter((log) => {
    const matchesSeverity = severityFilter === "ALL" || log.severity === severityFilter;
    const matchesSource = sourceFilter === "ALL" || log.source === sourceFilter;

    // Support simple regex search or case-insensitive search
    let matchesSearch = true;
    if (searchQuery) {
      try {
        const regex = new RegExp(searchQuery, "i");
        matchesSearch = regex.test(log.message) || regex.test(log.source);
      } catch (e) {
        matchesSearch =
          log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.source.toLowerCase().includes(searchQuery.toLowerCase());
      }
    }

    return matchesSeverity && matchesSource && matchesSearch;
  });

  return (
    <div id="logs-view" className="flex flex-col h-[calc(100vh-140px)] gap-4">
      {/* Filters address bar */}
      <div className="bg-[#111113] border border-[#1c1c1e] p-4 rounded space-y-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:space-y-0">
        {/* Search bar */}
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#555555] absolute left-3 top-2.5" />
          <input
            id="logs-search-input"
            type="text"
            placeholder="Regex search message... e.g. connect(ion)?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-black text-xs border border-[#1c1c1e] hover:border-[#2c2c2e] focus:border-white rounded pl-9 pr-3 py-2 w-full text-white focus:outline-none font-mono"
          />
        </div>

        {/* Filters and toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Severity Filters */}
          <div className="flex bg-black border border-[#1c1c1e] rounded p-0.5">
            {["ALL", "INFO", "WARN", "ERROR"].map((level) => {
              const isSelected = severityFilter === level;
              return (
                <button
                  key={level}
                  onClick={() => setSeverityFilter(level as any)}
                  className={`px-2.5 py-1 text-[9px] font-mono font-bold rounded uppercase transition-colors ${
                    isSelected
                      ? "bg-white text-black border border-white"
                      : "text-[#888888] hover:text-white border border-transparent"
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>

          {/* Source filter selector */}
          <select
            id="logs-source-select"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-black text-[9px] font-mono border border-[#1c1c1e] p-1.5 rounded text-white focus:outline-none focus:border-white"
          >
            {sources.map((s) => (
              <option key={s} value={s}>
                SRC: {s.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Live Tail toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-mono text-[#888888] uppercase select-none font-bold">
            <input
              type="checkbox"
              checked={liveTail}
              onChange={() => setLiveTail(!liveTail)}
              className="accent-white cursor-pointer"
            />
            Live Tail
          </label>
        </div>
      </div>

      {/* Terminal Grid Panel */}
      <div className="flex-1 bg-black border border-[#1c1c1e] rounded overflow-hidden flex flex-col font-mono text-xs">
        {/* Term Top Header */}
        <div className="bg-[#111113] border-b border-[#1c1c1e] px-4 py-2.5 flex justify-between items-center text-[9px] text-[#888888]">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-[0.1em] text-white">
            <Terminal className="w-4 h-4 text-white animate-pulse" />
            OM_Console_Stream.log
          </span>
          <span className="uppercase tracking-wider font-bold">Showing {filteredLogs.length} logs</span>
        </div>

        {/* Term logs Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[calc(100vh-310px)]">
          {filteredLogs.map((log) => {
            const isExpanded = log.id === expandedLogId;
            const severityColors = {
              INFO: "text-white bg-white/5 border-white/10",
              WARN: "text-amber-400 bg-amber-500/5 border-amber-500/10",
              ERROR: "text-rose-400 bg-rose-500/5 border-rose-500/10"
            }[log.severity] || "text-white/40";

            return (
              <div
                key={log.id}
                className={`border rounded transition-colors overflow-hidden ${
                  isExpanded
                    ? "bg-[#111113]/40 border-[#2c2c2e]"
                    : "bg-black border-[#1c1c1e] hover:border-[#2c2c2e]"
                }`}
              >
                {/* Compact Row clickable */}
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="p-3 cursor-pointer flex items-start sm:items-center justify-between gap-3 text-xs leading-relaxed"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
                    {/* Timestamp */}
                    <span className="text-[9px] text-[#555555] flex-shrink-0 font-mono">
                      {log.timestamp.split(" ")[1] || log.timestamp}
                    </span>

                    {/* Severity tag */}
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border font-mono uppercase tracking-wider ${severityColors}`}>
                      {log.severity}
                    </span>

                    {/* Source label */}
                    <span className="font-bold text-white text-[9px] tracking-wider uppercase flex-shrink-0 font-mono">
                      [{log.source}]
                    </span>

                    {/* Message string snippet */}
                    <p className="text-[#cccccc] font-sans break-all truncate w-full">
                      {log.message}
                    </p>
                  </div>

                  {/* Expand icon arrow */}
                  <div className="p-0.5 text-[#555555]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded Details drawer with JSON tree & Actions */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="border-t border-[#1c1c1e] bg-black p-4 space-y-3 overflow-hidden text-[10px]"
                    >
                      {/* Detailed Python traceback if it is an error log */}
                      {log.metadata?.error_trace ? (
                        <div>
                          <div className="flex items-center justify-between text-[8px] text-[#888888] mb-1 font-mono uppercase tracking-wider font-bold">
                            <span className="text-rose-400">
                              System Exception Traceback Block
                            </span>
                          </div>
                          <pre className="p-3 bg-rose-950/10 border border-rose-950/20 rounded text-[9px] font-mono text-rose-300 overflow-x-auto leading-relaxed">
                            {log.metadata.error_trace}
                          </pre>
                        </div>
                      ) : (
                        // Standard generic metadata tree
                        log.metadata && (
                          <div>
                            <span className="text-[8px] font-bold text-[#888888] uppercase tracking-wider block mb-1 font-mono">
                              Payload JSON Metadata Context
                            </span>
                            <pre className="p-3 bg-black border border-[#1c1c1e] rounded text-[9px] text-white/80 overflow-x-auto font-mono">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )
                      )}

                      {/* Expand Action row */}
                      <div className="flex gap-2.5 pt-2">
                        {log.metadata && (
                          <button
                            onClick={() => handleCopyTrace(log)}
                            className="px-3 py-1.5 bg-[#111113] border border-[#1c1c1e] hover:border-[#2c2c2e] text-white rounded font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy Metadata JSON
                          </button>
                        )}
                        <button
                          onClick={() => onTriggerReplay(log)}
                          className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 rounded font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all"
                        >
                          <Play className="w-3.5 h-3.5" /> Replay Trigger Event
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
