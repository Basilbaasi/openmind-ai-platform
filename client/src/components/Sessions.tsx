import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Trash2,
  ExternalLink,
  Plus,
  Play,
  Sliders,
  Clock,
  Sparkles,
  Layers,
  Database
} from "lucide-react";
import { PlaygroundSession, Model } from "../types";

interface SessionsProps {
  sessions: PlaygroundSession[];
  models: Model[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onCreateSession: (modelId: string) => void;
  onNavigate: (tab: string) => void;
}

export default function Sessions({
  sessions,
  models,
  onSelectSession,
  onDeleteSession,
  onCreateSession,
  onNavigate
}: SessionsProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleResumeSession = (id: string) => {
    onSelectSession(id);
    onNavigate("playground");
  };

  const filteredSessions = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      models
        .find((m) => m.id === s.modelId)
        ?.name.toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  // Stats calculation
  const totalMessagesCount = sessions.reduce((acc, s) => acc + (s.messages?.length || 0), 0);
  const averageContextCount = Math.round(totalMessagesCount / (sessions.length || 1) * 350);

  return (
    <div id="sessions-view" className="space-y-6">
      {/* Top statistics overview row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111113] border border-[#1c1c1e] p-4 rounded flex items-center gap-4">
          <div className="p-3 rounded bg-white/5 text-white">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#888888]">Total Saved Sessions</p>
            <p className="text-xl font-bold text-white mt-0.5">{sessions.length} Active</p>
          </div>
        </div>

        <div className="bg-[#111113] border border-[#1c1c1e] p-4 rounded flex items-center gap-4">
          <div className="p-3 rounded bg-white/5 text-white">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#888888]">Total Messages Exchanged</p>
            <p className="text-xl font-bold text-white mt-0.5">{totalMessagesCount} Turns</p>
          </div>
        </div>

        <div className="bg-[#111113] border border-[#1c1c1e] p-4 rounded flex items-center gap-4">
          <div className="p-3 rounded bg-white/5 text-white">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#888888]">Avg Context Utilization</p>
            <p className="text-xl font-bold text-white mt-0.5">~{averageContextCount} Tokens</p>
          </div>
        </div>
      </div>

      {/* Control panel & action cards */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111113] border border-[#1c1c1e] p-4 rounded">
        <div className="relative flex-1 w-full">
          <input
            id="session-search"
            type="text"
            placeholder="Search active conversation histories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-black text-xs border border-[#1c1c1e] hover:border-[#2c2c2e] focus:border-white rounded pl-4 pr-3 py-2 w-full text-white focus:outline-none font-sans"
          />
        </div>

        <button
          id="create-session-btn"
          onClick={() => {
            const mId = models[0]?.id || "llama3-8b-instruct";
            onCreateSession(mId);
            onNavigate("playground");
          }}
          className="w-full sm:w-auto px-5 py-2 bg-white hover:bg-neutral-200 text-black text-[11px] font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 text-black" /> Start Live Conversation
        </button>
      </div>

      {/* Sessions Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredSessions.map((sess) => {
            const sessionModel = models.find((m) => m.id === sess.modelId) || models[0];
            const msgs = sess.messages || [];
            const systemPrompt = msgs.find((m) => m.role === "system")?.content || "No persona loaded.";

            return (
              <motion.div
                key={sess.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#111113] border border-[#1c1c1e] hover:border-[#2c2c2e] p-5 rounded flex flex-col justify-between group transition-all"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-white truncate group-hover:text-neutral-300 transition-colors">
                        {sess.title}
                      </h3>
                      <span className="text-[10px] text-[#888888] font-mono mt-0.5 block">
                        Model: {sessionModel?.name || "Unknown"}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[8px] font-mono uppercase bg-black border border-[#1c1c1e] text-white">
                      {msgs.length} turns
                    </span>
                  </div>

                  <div className="p-3 bg-black border border-[#1c1c1e] rounded text-[11px] text-[#888888] font-sans mt-3">
                    <span className="text-[9px] font-mono text-[#555555] uppercase font-bold tracking-wider block mb-1">
                      System Persona
                    </span>
                    <p className="line-clamp-2 italic leading-relaxed">
                      "{systemPrompt}"
                    </p>
                  </div>

                  {/* Config mini details */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-mono text-[#888888] border-t border-[#1c1c1e] pt-3">
                    <div className="flex justify-between bg-black p-1 px-2 rounded border border-[#1c1c1e]/60">
                      <span>Temp</span>
                      <span className="text-white font-bold">{sess.temperature}</span>
                    </div>
                    <div className="flex justify-between bg-black p-1 px-2 rounded border border-[#1c1c1e]/60">
                      <span>Max Output</span>
                      <span className="text-white font-bold">{sess.maxTokens}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-[#1c1c1e]">
                  <span className="text-[10px] text-[#555555] font-mono flex items-center gap-1 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-[#555555]" />
                    {sess.createdAt || "recently"}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResumeSession(sess.id)}
                      className="px-3 py-1.5 bg-white hover:bg-neutral-200 text-black text-[9px] font-mono uppercase font-bold tracking-widest rounded transition-all flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 text-black" /> Resume
                    </button>
                    <button
                      onClick={() => onDeleteSession(sess.id)}
                      className="p-2 text-[#555555] hover:text-white border border-[#1c1c1e] hover:border-[#2c2c2e] rounded transition-all"
                      title="Purge Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
