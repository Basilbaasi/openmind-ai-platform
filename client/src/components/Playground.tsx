import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Trash2,
  Sliders,
  Sparkles,
  RefreshCw,
  Plus,
  Compass,
  Check,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { Model, PlaygroundSession, Message } from "../types";

interface PlaygroundProps {
  sessions: PlaygroundSession[];
  models: Model[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: (modelId: string) => void;
  onDeleteSession: (id: string) => void;
  onUpdateSessionMessages: (sessionId: string, messages: Message[]) => void;
  onUpdateSessionParams: (
    sessionId: string,
    params: {
      temperature: number;
      maxTokens: number;
      topP: number;
      presencePenalty: number;
      jsonMode: boolean;
      modelId: string;
    }
  ) => void;
}

export default function Playground({
  sessions,
  models,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onUpdateSessionMessages,
  onUpdateSessionParams
}: PlaygroundProps) {
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    (activeSession?.messages || []).find((m) => m.role === "system")?.content ||
      "You are a helpful AI assistant."
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(false);
  const [thinkingProcess, setThinkingProcess] = useState<string>("");

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-900/20 border border-gray-800 p-8 rounded-xl">
        <AlertCircle className="w-12 h-12 text-gray-500 mb-3" />
        <h3 className="text-gray-300 font-bold">No Sessions Available</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          Please create a new workspace session to start testing prompts and model generation.
        </p>
        <button
          onClick={() => onCreateSession(models[0]?.id || "gemini-3.5-flash")}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Start New Workspace
        </button>
      </div>
    );
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    setErrorMsg(null);

    // Build the updated messages list
    const systemMessage: Message = {
      id: "sys_" + Date.now(),
      role: "system",
      content: systemPrompt,
      timestamp: new Date().toLocaleTimeString()
    };

    const userMessage: Message = {
      id: "user_" + Date.now(),
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString()
    };

    const otherMessages = (activeSession.messages || []).filter((m) => m.role !== "system");
    const newMessages = [systemMessage, ...otherMessages, userMessage];

    // Optimistically update frontend state
    onUpdateSessionMessages(activeSession.id, newMessages);
    setInput("");
    setIsLoading(true);

    // Simulate thinking if the active model is deepseek-r1
    const modelObj = models.find((m) => m.id === activeSession.modelId);
    const isReasoningModel = modelObj?.id.includes("deepseek") || modelObj?.id.includes("r1");

    if (isReasoningModel) {
      setShowThinking(true);
      setThinkingProcess("Initializing deep-thought reasoning tree...\nAnalyzing prompt constraints and semantic bounds...");
      setTimeout(() => {
        setThinkingProcess(
          (prev) =>
            prev +
            "\nReasoning path selected: Core math/logic framework.\nValidating SQL query outputs..."
        );
      }, 1000);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          modelId: activeSession.modelId,
          temperature: activeSession.temperature,
          maxTokens: activeSession.maxTokens,
          systemInstruction: systemPrompt
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to generate AI response.");
      }

      // Add assistant response to messages
      const assistantMessage: Message = {
        id: "assistant_" + Date.now(),
        role: "assistant",
        content: data.content,
        timestamp: new Date().toLocaleTimeString()
      };

      onUpdateSessionMessages(activeSession.id, [...newMessages, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message || "An error occurred while communicating with the server."
      );
    } finally {
      setIsLoading(false);
      setShowThinking(false);
      setThinkingProcess("");
    }
  };

  const handleClearChat = () => {
    onUpdateSessionMessages(activeSession.id, [
      {
        id: "sys_" + Date.now(),
        role: "system",
        content: systemPrompt,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const currentModel = models.find((m) => m.id === activeSession.modelId) || models[0];

  return (
    <div id="playground-view" className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
      {/* Left Sidebar: Session Workspace Selector */}
      <div className="bg-[#111113] border border-[#1c1c1e] rounded-lg p-4 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1c1c1e]">
          <h2 className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-white">
            Workspaces
          </h2>
          <button
            id="playground-new-session"
            onClick={() => onCreateSession(models[0]?.id || "gemini-3.5-flash")}
            className="p-1.5 bg-[#161618] border border-[#2c2c2e] text-white hover:bg-white hover:text-black rounded transition-all"
            title="Create New Session"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              onClick={() => {
                onSelectSession(sess.id);
                const activeSys = sess.messages.find((m) => m.role === "system");
                if (activeSys) setSystemPrompt(activeSys.content);
              }}
              className={`p-3 rounded cursor-pointer flex items-center justify-between group transition-colors border ${
                sess.id === activeSessionId
                  ? "bg-[#161618] border-[#2c2c2e] text-white"
                  : "bg-[#0a0a0b]/60 border-[#1c1c1e] hover:bg-[#161618]/30 hover:border-[#2c2c2e] text-[#888888]"
              }`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className={`text-xs truncate leading-snug ${sess.id === activeSessionId ? "font-bold text-white" : "font-normal"}`}>
                  {sess.title}
                </p>
                <span className="text-[9px] text-[#555555] font-mono block mt-0.5 uppercase tracking-wider">
                  {models.find((m) => m.id === sess.modelId)?.name || "Gemini Flash"}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(sess.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-[#555555] transition-all"
                title="Delete Session"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Center Panel: Active Chat Workspace */}
      <div className="lg:col-span-2 flex flex-col bg-[#111113] border border-[#1c1c1e] rounded-lg overflow-hidden h-full">
        {/* Top bar of active chat */}
        <div className="bg-black border-b border-[#1c1c1e] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            <input
              id="playground-session-title"
              type="text"
              value={activeSession.title}
              onChange={(e) => {
                activeSession.title = e.target.value;
                onUpdateSessionParams(activeSession.id, {
                  temperature: activeSession.temperature,
                  maxTokens: activeSession.maxTokens,
                  topP: activeSession.topP,
                  presencePenalty: activeSession.presencePenalty,
                  jsonMode: activeSession.jsonMode,
                  modelId: activeSession.modelId
                });
              }}
              className="text-xs font-serif italic text-white bg-transparent border-b border-transparent hover:border-[#2c2c2e] focus:border-white focus:outline-none px-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest text-[#888888] hover:text-white border border-[#1c1c1e] hover:border-[#2c2c2e] bg-black rounded"
            >
              Clear Feed
            </button>
          </div>
        </div>

        {/* System instruction panel */}
        <div className="bg-[#0a0a0b]/40 border-b border-[#1c1c1e] p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] uppercase font-sans font-bold tracking-[0.15em] text-[#888888] flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-white" />
              System Instruction / Persona
            </span>
            <span className="text-[9px] font-mono text-[#555555]">INJECTS SYSTEM TURN</span>
          </div>
          <textarea
            id="playground-system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Tell the model how to behave..."
            className="w-full bg-black text-xs border border-[#1c1c1e] hover:border-[#2c2c2e] focus:border-white focus:outline-none rounded p-2 text-white font-sans resize-none h-14"
          />
        </div>

        {/* Message Feed container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
          {/* Default blank state info */}
          {activeSession.messages.filter((m) => m.role !== "system").length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-[#888888] space-y-2">
              <Sparkles className="w-6 h-6 text-[#555555] animate-pulse" />
              <p className="text-xs font-bold text-white font-serif italic">Playground State Empty</p>
              <p className="text-[11px] text-[#888888] max-w-xs leading-normal">
                Submit a query below. The workspace compiles context live and routes optimization logs.
              </p>
            </div>
          )}

          {activeSession.messages
            .filter((m) => m.role !== "system")
            .map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded p-3.5 border text-xs leading-relaxed ${
                      isUser
                        ? "bg-white/[0.03] border-[#2c2c2e] text-[#e0e0e0]"
                        : "bg-black border-[#1c1c1e] text-[#cccccc]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 text-[8px] font-mono text-[#555555] uppercase tracking-wider gap-4">
                      <span>{isUser ? "USER" : currentModel.name.toUpperCase()}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="whitespace-pre-wrap font-sans text-white/90">{msg.content}</p>
                  </div>
                </div>
              );
            })}

          {/* Thinking overlay */}
          <AnimatePresence>
            {showThinking && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] rounded p-3.5 bg-black border border-[#1c1c1e] text-xs">
                  <div className="flex items-center gap-2 mb-2 text-white font-mono text-[9px] uppercase font-bold tracking-widest animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Deep Thought Chain...
                  </div>
                  <pre className="font-mono text-[9px] text-[#555555] bg-[#0a0a0b] p-2.5 rounded border border-[#1c1c1e]/60 overflow-x-auto whitespace-pre-wrap">
                    {thinkingProcess}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error display */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/5 border border-rose-500/15 rounded text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-rose-300">Generation Failed</p>
                <p className="text-[11px] mt-0.5 leading-normal">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-3 bg-[#0a0a0b]/60 border-t border-[#1c1c1e] flex items-center gap-2">
          <textarea
            id="playground-user-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your prompt here... (Shift+Enter for newline)"
            className="flex-1 bg-black text-xs border border-[#1c1c1e] focus:border-[#2c2c2e] focus:outline-none rounded p-2.5 text-white resize-none max-h-20 font-sans"
          />
          <button
            id="playground-send-btn"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`p-2.5 rounded transition-colors flex items-center justify-center border ${
              isLoading || !input.trim()
                ? "bg-[#111113] border-[#1c1c1e] text-[#555555] cursor-not-allowed"
                : "bg-white hover:bg-neutral-200 border-white text-black"
            }`}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Right Sidebar: Configuration Panel */}
      <div className="bg-[#111113] border border-[#1c1c1e] rounded-lg p-4 flex flex-col h-full overflow-y-auto space-y-5">
        <div>
          <h2 className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-white mb-3 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-white" />
            Run Configuration
          </h2>
          <p className="text-[11px] text-[#888888] leading-normal">
            Configure dynamic LLM routing thresholds and parameter bounds.
          </p>
        </div>

        {/* Model Routing Selector */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono uppercase tracking-wider font-bold text-[#888888] block">
            Target Model Routing
          </label>
          <select
            id="playground-model-select"
            value={activeSession.modelId}
            onChange={(e) =>
              onUpdateSessionParams(activeSession.id, {
                temperature: activeSession.temperature,
                maxTokens: activeSession.maxTokens,
                topP: activeSession.topP,
                presencePenalty: activeSession.presencePenalty,
                jsonMode: activeSession.jsonMode,
                modelId: e.target.value
              })
            }
            className="w-full bg-black text-xs border border-[#1c1c1e] hover:border-[#2c2c2e] rounded p-2 text-white focus:outline-none focus:border-white"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </select>
        </div>

        {/* Temperature slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[9px] font-mono text-[#888888]">
            <span className="uppercase font-bold tracking-wider">Temperature</span>
            <span className="text-white font-bold">{activeSession.temperature}</span>
          </div>
          <input
            id="playground-temp-slider"
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={activeSession.temperature}
            onChange={(e) =>
              onUpdateSessionParams(activeSession.id, {
                temperature: parseFloat(e.target.value),
                maxTokens: activeSession.maxTokens,
                topP: activeSession.topP,
                presencePenalty: activeSession.presencePenalty,
                jsonMode: activeSession.jsonMode,
                modelId: activeSession.modelId
              })
            }
            className="w-full accent-white cursor-pointer"
          />
          <div className="flex justify-between text-[8px] text-[#555555] font-mono uppercase tracking-wider">
            <span>Precise (0.0)</span>
            <span>Creative (1.5)</span>
          </div>
        </div>

        {/* Max Tokens slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[9px] font-mono text-[#888888]">
            <span className="uppercase font-bold tracking-wider">Max Outputs</span>
            <span className="text-white font-bold">{activeSession.maxTokens}</span>
          </div>
          <input
            id="playground-tokens-slider"
            type="range"
            min="64"
            max="4096"
            step="64"
            value={activeSession.maxTokens}
            onChange={(e) =>
              onUpdateSessionParams(activeSession.id, {
                temperature: activeSession.temperature,
                maxTokens: parseInt(e.target.value),
                topP: activeSession.topP,
                presencePenalty: activeSession.presencePenalty,
                jsonMode: activeSession.jsonMode,
                modelId: activeSession.modelId
              })
            }
            className="w-full accent-white cursor-pointer"
          />
        </div>

        {/* Top P slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[9px] font-mono text-[#888888]">
            <span className="uppercase font-bold tracking-wider">Top P (Nucleus)</span>
            <span className="text-white font-bold">{activeSession.topP}</span>
          </div>
          <input
            id="playground-topp-slider"
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={activeSession.topP}
            onChange={(e) =>
              onUpdateSessionParams(activeSession.id, {
                temperature: activeSession.temperature,
                maxTokens: activeSession.maxTokens,
                topP: parseFloat(e.target.value),
                presencePenalty: activeSession.presencePenalty,
                jsonMode: activeSession.jsonMode,
                modelId: activeSession.modelId
              })
            }
            className="w-full accent-white cursor-pointer"
          />
        </div>

        {/* Presence Penalty slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[9px] font-mono text-[#888888]">
            <span className="uppercase font-bold tracking-wider">Presence Penalty</span>
            <span className="text-white font-bold">{activeSession.presencePenalty}</span>
          </div>
          <input
            id="playground-presence-slider"
            type="range"
            min="-1"
            max="1"
            step="0.1"
            value={activeSession.presencePenalty}
            onChange={(e) =>
              onUpdateSessionParams(activeSession.id, {
                temperature: activeSession.temperature,
                maxTokens: activeSession.maxTokens,
                topP: activeSession.topP,
                presencePenalty: parseFloat(e.target.value),
                jsonMode: activeSession.jsonMode,
                modelId: activeSession.modelId
              })
            }
            className="w-full accent-white cursor-pointer"
          />
        </div>

        {/* JSON Mode Toggle */}
        <div className="flex items-center justify-between p-2.5 bg-black border border-[#1c1c1e] rounded">
          <div>
            <span className="text-xs font-bold text-white block">JSON Mode</span>
            <span className="text-[9px] text-[#888888] mt-0.5 block">Force structured JSON</span>
          </div>
          <button
            id="playground-json-toggle"
            onClick={() =>
              onUpdateSessionParams(activeSession.id, {
                temperature: activeSession.temperature,
                maxTokens: activeSession.maxTokens,
                topP: activeSession.topP,
                presencePenalty: activeSession.presencePenalty,
                jsonMode: !activeSession.jsonMode,
                modelId: activeSession.modelId
              })
            }
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors focus:outline-none ${
              activeSession.jsonMode ? "bg-white" : "bg-[#161618]"
            }`}
          >
            <div
              className={`w-4.5 h-4.5 rounded-full transition-transform ${
                activeSession.jsonMode ? "translate-x-4.5 bg-black" : "translate-x-0 bg-white"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
