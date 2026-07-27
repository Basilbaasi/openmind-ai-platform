import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  Database,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  Play,
  FileText,
  AlertCircle,
  Sliders,
  Sparkles
} from "lucide-react";
import { IngestedSource } from "../types";

interface KnowledgeProps {
  sources: IngestedSource[];
  onAddSource: (src: IngestedSource) => void;
  onDeleteSource: (id: string) => void;
}

export default function Knowledge({
  sources,
  onAddSource,
  onDeleteSource
}: KnowledgeProps) {
  const [dragActive, setDragActive] = useState(false);
  const [ingestProgress, setIngestProgress] = useState<number | null>(null);
  const [ingestStatus, setIngestStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Search Workbench State
  const [testQuery, setTestQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const simulateIngest = (fileName: string, fileSize: number) => {
    setSelectedFile({ name: fileName, size: fileSize });
    setIngestProgress(10);
    setIngestStatus("Initializing pipeline core...");

    setTimeout(() => {
      setIngestProgress(35);
      setIngestStatus("Splitting document into 512-character chunks...");
    }, 800);

    setTimeout(() => {
      setIngestProgress(70);
      setIngestStatus("Vectorizing 24 chunks via BGE Large v1.5...");
    }, 1800);

    setTimeout(() => {
      setIngestProgress(100);
      setIngestStatus("Writing dense index to vector DB store... Deployed!");

      const isMarkdown = fileName.endsWith(".md") || fileName.endsWith(".txt");
      const finalType = isMarkdown ? "Markdown" : "PDF";

      // Save to parent state
      onAddSource({
        id: "src_" + Date.now(),
        name: fileName,
        type: finalType,
        sizeBytes: fileSize,
        chunksCount: 24,
        embeddingSize: 1024,
        status: "Indexed",
        progress: 100,
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " ")
      });

      setTimeout(() => {
        setIngestProgress(null);
        setIngestStatus("");
        setSelectedFile(null);
      }, 1000);
    }, 3000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      simulateIngest(file.name, file.size);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      simulateIngest(file.name, file.size);
    }
  };

  const handleRetrievalTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setIsSearching(true);
    setTestResults(null);

    setTimeout(() => {
      setIsSearching(false);

      // Synthesize matching chunk references depending on the search query
      const queryLower = testQuery.toLowerCase();
      if (queryLower.includes("api") || queryLower.includes("endpoint") || queryLower.includes("v1")) {
        setTestResults([
          {
            source: "API_v1_Documentation.pdf",
            score: 0.94,
            chunkText: "Bearer authentication token must be passed in the HTTP Authorization header as 'Authorization: Bearer <key_prefix>'. The default route for standard text completions is mapped as POST to /v1/chat/completions.",
            summary: "Details authentication protocols and default endpoint routes."
          },
          {
            source: "System_Architecture_Layout.md",
            score: 0.78,
            chunkText: "Incoming client queries hit the API Gateway microservice first, which validates the active api_key and routes requests internally to CUDA workers.",
            summary: "Defines flow topology of client API triggers."
          }
        ]);
      } else if (queryLower.includes("gpu") || queryLower.includes("cuda") || queryLower.includes("vram")) {
        setTestResults([
          {
            source: "GPU_Cluster_Setup_Notes.txt",
            score: 0.91,
            chunkText: "The local system maps GGUF-quantized weights to VRAM pages dynamically. High-concurrency requests trigger scaling across GPU partitions if latency thresholds exceed 120ms.",
            summary: "Specifies GPU hardware scheduling bounds."
          }
        ]);
      } else {
        // Fallback random match
        setTestResults([
          {
            source: "System_Architecture_Layout.md",
            score: 0.65,
            chunkText: `Relevance matching resolved default indices against query: '${testQuery}'. Fallback structures default to localized embedding lookups.`,
            summary: "Generic context fallback resolution."
          }
        ]);
      }
    }, 800);
  };

  return (
    <div id="knowledge-base-view" className="space-y-6">
      {/* Grid: Top Upload Area & Retrieval Testing Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Ingestion area */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded flex flex-col justify-between h-[300px]">
          <div>
            <h3 className="text-[10px] font-sans font-bold uppercase tracking-wider text-white">
              Ingestion Pipeline
            </h3>
            <p className="text-[10px] text-[#888888] mt-0.5">
              Drag files or click to initiate automatic chunking and dense vector indexing.
            </p>
          </div>

          <div className="flex-1 my-4 flex items-center justify-center">
            {ingestProgress !== null ? (
              <div className="w-full max-w-sm space-y-3 text-center font-mono">
                <RefreshCw className="w-8 h-8 text-white animate-spin mx-auto" />
                <p className="text-xs font-bold text-white uppercase tracking-wider">{ingestStatus}</p>
                <div className="w-full bg-[#1c1c1e] h-2 rounded overflow-hidden">
                  <div
                    className="bg-white h-2 rounded transition-all duration-300"
                    style={{ width: `${ingestProgress}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-[#555555] uppercase font-bold tracking-wider">{ingestProgress}% Indexed</span>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`w-full h-full border border-dashed rounded flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer ${
                  dragActive
                    ? "border-white bg-white/[0.02]"
                    : "border-[#1c1c1e] hover:border-white hover:bg-white/[0.01]"
                }`}
                onClick={() => document.getElementById("file-upload-input")?.click()}
              >
                <Upload className="w-8 h-8 text-[#555555] mb-2 hover:text-white" />
                <p className="text-xs font-semibold text-[#cccccc]">
                  Drag and drop document here, or <span className="text-white underline">browse</span>
                </p>
                <span className="text-[9px] text-[#555555] mt-1 font-mono uppercase tracking-wider">
                  Supports PDF, MD, TXT up to 25MB. Autochunks to 512 token overlapping limits.
                </span>
                <input
                  id="file-upload-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileInput}
                  accept=".pdf,.md,.txt"
                />
              </div>
            )}
          </div>
        </div>

        {/* Retrieval testing workbench */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded flex flex-col justify-between h-[300px]">
          <div>
            <h3 className="text-[10px] font-sans font-bold uppercase tracking-wider text-white">
              Retrieval & Relevance Testing
            </h3>
            <p className="text-[10px] text-[#888888] mt-0.5">
              Verify vector index lookup density and relevance matching scores.
            </p>
          </div>

          <form onSubmit={handleRetrievalTest} className="flex gap-2 my-3">
            <input
              id="retrieval-query-input"
              type="text"
              placeholder="Query semantic index... e.g. Bearer auth"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              className="flex-1 bg-black text-xs border border-[#1c1c1e] hover:border-[#2c2c2e] focus:border-white focus:outline-none rounded p-2.5 text-white"
            />
            <button
              id="retrieval-test-btn"
              type="submit"
              disabled={isSearching}
              className="px-4 bg-white hover:bg-neutral-200 text-black rounded font-bold flex items-center justify-center text-[10px] uppercase tracking-wider gap-1 transition-colors"
            >
              {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" /> : "Test Retrieval"}
            </button>
          </form>

          <div className="flex-1 bg-black border border-[#1c1c1e] rounded p-3 overflow-y-auto font-mono text-xs">
            {testResults ? (
              <div className="space-y-3">
                {testResults.map((res, i) => (
                  <div key={i} className="space-y-1.5 text-[11px] pb-2 border-b border-[#1c1c1e] last:border-0 last:pb-0">
                    <div className="flex justify-between items-center text-[9px] font-mono text-[#555555]">
                      <span className="flex items-center gap-1 font-bold text-[#888888]">
                        <FileText className="w-3.5 h-3.5" />
                        {res.source.toUpperCase()}
                      </span>
                      <span className="text-black bg-white border border-white font-bold text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded">
                        Score: {(res.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-[#cccccc] italic font-sans leading-relaxed">
                      "{res.chunkText}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-[#555555]">
                <Search className="w-7 h-7 mb-1.5 text-[#333333]" />
                <p className="text-[9px] uppercase tracking-widest font-bold">Awaiting Test Query</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Indexed Sources Table */}
      <div className="bg-[#111113] border border-[#1c1c1e] rounded overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1c1c1e] flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-sans font-bold uppercase tracking-wider text-white">
              Indexed Documents Base
            </h3>
            <p className="text-[10px] text-[#888888] mt-0.5">
              Active documents mapped into vector repository partitions.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse font-mono">
            <thead>
              <tr className="border-b border-[#1c1c1e] text-[9px] uppercase tracking-wider text-[#555555]">
                <th className="p-4">File Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">Size (KB)</th>
                <th className="p-4">Chunks count</th>
                <th className="p-4">Embed Vector Size</th>
                <th className="p-4">Pipeline Status</th>
                <th className="p-4 text-right">Teardown</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((src) => {
                const isProcessing = src.status === "Processing";

                return (
                  <tr key={src.id} className="border-b border-[#1c1c1e] hover:bg-black/30 transition-colors text-[#cccccc]">
                    <td className="p-4 font-bold flex items-center gap-2 text-white">
                      <FileText className="w-4 h-4 text-white" />
                      {src.name}
                    </td>
                    <td className="p-4 text-[10px] text-[#888888] uppercase">{src.type}</td>
                    <td className="p-4 text-[10px]">{(src.sizeBytes / 1024).toFixed(0)}</td>
                    <td className="p-4 text-[10px]">{src.chunksCount}</td>
                    <td className="p-4 text-[10px] text-[#888888]">{src.embeddingSize}</td>
                    <td className="p-4">
                      {isProcessing ? (
                        <span className="flex items-center gap-1.5 text-white font-mono text-[9px] uppercase tracking-wider font-bold">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Processing ({src.progress}%)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-white font-mono text-[9px] uppercase tracking-wider font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                          Indexed
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onDeleteSource(src.id)}
                        className="p-1.5 text-[#555555] hover:text-white border border-[#1c1c1e] hover:border-[#2c2c2e] rounded transition-all"
                        title="Teardown Index"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
