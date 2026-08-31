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
  FileText,
  AlertCircle,
  Layers,
  Cpu,
  X,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { IngestedSource, Model } from "../types";
import { knowledgeApi } from "../api/client";

interface KnowledgeProps {
  sources: IngestedSource[];
  models?: Model[];
  onAddSource: (src: IngestedSource) => void;
  onDeleteSource: (id: string) => void;
}

interface ChunkDetail {
  id: string;
  sourceId: string;
  chunkIndex: number;
  chunkText: string;
  embeddingModel: string;
}

export default function Knowledge({
  sources,
  models = [],
  onAddSource,
  onDeleteSource
}: KnowledgeProps) {
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Embedding Model Selection
  const embeddingModels = models.filter((m) => m.type === "embedding");
  const [selectedModelId, setSelectedModelId] = useState<string>(
    embeddingModels[0]?.name || embeddingModels[0]?.id || "bge-large-en-v1.5"
  );

  // Search Workbench State
  const [testQuery, setTestQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);

  // Inspect Chunks Modal
  const [inspectingSource, setInspectingSource] = useState<IngestedSource | null>(null);
  const [sourceChunks, setSourceChunks] = useState<ChunkDetail[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleProcessFile = async (file: File) => {
    setIsUploading(true);
    setErrorMessage(null);
    setUploadStatus("Uploading document & parsing text structure...");
    setUploadProgress(25);

    try {
      setUploadStatus("Running semantic chunking with PyMuPDF/text extraction...");
      setUploadProgress(60);

      // Perform real backend upload and ingestion
      const result = await knowledgeApi.upload(file, selectedModelId);

      setUploadProgress(90);
      setUploadStatus("Registering semantic chunks in database...");

      const newSource: IngestedSource = {
        id: result.id || "src_" + Date.now(),
        name: result.name || file.name,
        type: result.type || (file.name.endsWith(".pdf") ? "PDF" : file.name.endsWith(".md") ? "Markdown" : "Text"),
        sizeBytes: result.size_bytes || result.sizeBytes || file.size,
        chunksCount: result.chunks_count || result.chunksCount || 0,
        embeddingSize: result.embedding_size || result.embeddingSize || 1024,
        status: (result.status as any) || "Indexed",
        progress: 100,
        createdAt: result.created_at || result.createdAt || new Date().toISOString().slice(0, 16).replace("T", " "),
        embeddingModel: result.embedding_model || result.embeddingModel || selectedModelId
      };

      onAddSource(newSource);
      setUploadProgress(100);
      setUploadStatus("Ingestion complete!");

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(null);
        setUploadStatus("");
      }, 1000);
    } catch (err: any) {
      console.error("Ingestion failed:", err);
      setErrorMessage(err.message || "Failed to ingest document. Please verify backend service.");
      setIsUploading(false);
      setUploadProgress(null);
      setUploadStatus("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleRetrievalTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setIsSearching(true);
    setTestResults(null);

    try {
      const results = await knowledgeApi.search(testQuery, 10);
      if (Array.isArray(results) && results.length > 0) {
        setTestResults(
          results.map((r) => {
            const matchingSource = sources.find((s) => s.id === r.sourceId);
            return {
              source: matchingSource ? matchingSource.name : "Document Chunk",
              chunkIndex: r.chunkIndex,
              score: r.score ?? 1.0,
              chunkText: r.chunkText,
              embeddingModel: r.embeddingModel || selectedModelId
            };
          })
        );
      } else {
        setTestResults([]);
      }
    } catch (err) {
      console.warn("Backend search error, falling back:", err);
      // Fallback search over local query matching
      setTestResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenChunksModal = async (src: IngestedSource) => {
    setInspectingSource(src);
    setIsLoadingChunks(true);
    try {
      const chunks = await knowledgeApi.getChunks(src.id);
      setSourceChunks(chunks || []);
    } catch (err) {
      console.error("Failed to fetch chunks:", err);
      setSourceChunks([]);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  return (
    <div id="knowledge-base-view" className="space-y-6">
      {/* Top Bar: Ingestion Pipeline & Model Configuration */}
      <div className="bg-[#111113] border border-[#1c1c1e] p-4 rounded flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            Knowledge Base & Document Ingestion
          </h2>
          <p className="text-[11px] text-[#888888] mt-0.5">
            Automatic text extraction (PyMuPDF for PDF, MD/TXT) and semantic paragraph chunking.
          </p>
        </div>

        {/* Selected Embedding Model Picker */}
        <div className="flex items-center gap-2 bg-black border border-[#1c1c1e] px-3 py-1.5 rounded">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono uppercase text-[#888888]">Target Embed Model:</span>
          {embeddingModels.length > 0 ? (
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="bg-transparent text-xs text-white font-mono focus:outline-none cursor-pointer"
            >
              {embeddingModels.map((m) => (
                <option key={m.id} value={m.name || m.id} className="bg-[#111113] text-white">
                  {m.name} ({m.parameters || "Dense"})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              placeholder="e.g. bge-large-en-v1.5"
              className="bg-transparent text-xs text-white font-mono focus:outline-none w-36"
            />
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-950/40 border border-red-800/50 rounded flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid: Top Upload Area & Retrieval Testing Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Ingestion area */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded flex flex-col justify-between h-[300px]">
          <div>
            <h3 className="text-[10px] font-sans font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-white" />
              Document Ingestion Engine
            </h3>
            <p className="text-[10px] text-[#888888] mt-0.5">
              Drag & drop files or click to parse via PyMuPDF and perform semantic paragraph chunking.
            </p>
          </div>

          <div className="flex-1 my-3 flex items-center justify-center">
            {isUploading ? (
              <div className="w-full max-w-sm space-y-3 text-center font-mono">
                <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
                <p className="text-xs font-bold text-white uppercase tracking-wider">{uploadStatus}</p>
                <div className="w-full bg-[#1c1c1e] h-2 rounded overflow-hidden">
                  <div
                    className="bg-sky-500 h-2 rounded transition-all duration-300"
                    style={{ width: `${uploadProgress || 50}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-[#888888] uppercase font-bold tracking-wider">
                  {uploadProgress}% Ingestion in Progress
                </span>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`w-full h-full border border-dashed rounded flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer ${
                  dragActive
                    ? "border-sky-400 bg-sky-950/20"
                    : "border-[#1c1c1e] hover:border-white hover:bg-white/[0.01]"
                }`}
                onClick={() => document.getElementById("file-upload-input")?.click()}
              >
                <Upload className="w-8 h-8 text-[#555555] mb-2 hover:text-white" />
                <p className="text-xs font-semibold text-[#cccccc]">
                  Drag and drop document here, or <span className="text-white underline">browse</span>
                </p>
                <span className="text-[9px] text-[#555555] mt-1 font-mono uppercase tracking-wider">
                  Supports PDF (PyMuPDF), Markdown, TXT. Semantic paragraph split (~512 chars with 50-char overlap).
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
            <h3 className="text-[10px] font-sans font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-white" />
              Retrieval & Chunk Search
            </h3>
            <p className="text-[10px] text-[#888888] mt-0.5">
              Query stored semantic chunks directly from backend database partition.
            </p>
          </div>

          <form onSubmit={handleRetrievalTest} className="flex gap-2 my-2">
            <input
              id="retrieval-query-input"
              type="text"
              placeholder="Query semantic chunks... e.g. architecture, API, system"
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
              {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" /> : "Search Chunks"}
            </button>
          </form>

          <div className="flex-1 bg-black border border-[#1c1c1e] rounded p-3 overflow-y-auto font-mono text-xs">
            {testResults !== null ? (
              testResults.length > 0 ? (
                <div className="space-y-3">
                  {testResults.map((res, i) => (
                    <div key={i} className="space-y-1 text-[11px] pb-2 border-b border-[#1c1c1e] last:border-0 last:pb-0">
                      <div className="flex justify-between items-center text-[9px] font-mono text-[#555555]">
                        <span className="flex items-center gap-1 font-bold text-[#888888]">
                          <FileText className="w-3.5 h-3.5 text-sky-400" />
                          {res.source.toUpperCase()} [Chunk #{res.chunkIndex + 1}]
                        </span>
                        <span className="text-white bg-white/10 border border-white/10 font-bold text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded">
                          {res.embeddingModel || "Dense"}
                        </span>
                      </div>
                      <p className="text-[#cccccc] font-sans leading-relaxed text-xs">
                        "{res.chunkText}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-[#555555]">
                  <Search className="w-6 h-6 mb-1 text-[#333333]" />
                  <p className="text-[10px] uppercase tracking-widest font-bold">No matching chunks found in database</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-[#555555]">
                <Search className="w-6 h-6 mb-1 text-[#333333]" />
                <p className="text-[9px] uppercase tracking-widest font-bold">Enter query above to test chunk retrieval</p>
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
              Indexed Documents Base ({sources.length})
            </h3>
            <p className="text-[10px] text-[#888888] mt-0.5">
              Active documents mapped into database storage with parsed semantic chunks.
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
                <th className="p-4">Embed Model</th>
                <th className="p-4">Pipeline Status</th>
                <th className="p-4 text-center">Inspect Chunks</th>
                <th className="p-4 text-right">Teardown</th>
              </tr>
            </thead>
            <tbody>
              {sources.length > 0 ? (
                sources.map((src) => {
                  const isProcessing = src.status === "Processing";

                  return (
                    <tr key={src.id} className="border-b border-[#1c1c1e] hover:bg-black/30 transition-colors text-[#cccccc]">
                      <td className="p-4 font-bold flex items-center gap-2 text-white">
                        <FileText className="w-4 h-4 text-sky-400" />
                        {src.name}
                      </td>
                      <td className="p-4 text-[10px] text-[#888888] uppercase">{src.type}</td>
                      <td className="p-4 text-[10px]">{(src.sizeBytes / 1024).toFixed(1)}</td>
                      <td className="p-4 text-[10px] font-bold text-white">{src.chunksCount}</td>
                      <td className="p-4 text-[10px] text-emerald-400 font-mono">
                        {src.embeddingModel || "bge-large-en-v1.5"}
                      </td>
                      <td className="p-4">
                        {isProcessing ? (
                          <span className="flex items-center gap-1.5 text-sky-400 font-mono text-[9px] uppercase tracking-wider font-bold">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Processing ({src.progress}%)
                          </span>
                        ) : src.status === "Failed" ? (
                          <span className="flex items-center gap-1.5 text-rose-400 font-mono text-[9px] uppercase tracking-wider font-bold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[9px] uppercase tracking-wider font-bold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Indexed
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenChunksModal(src)}
                          className="px-2.5 py-1 text-[9px] bg-white/5 hover:bg-white hover:text-black transition-all border border-[#1c1c1e] rounded font-mono uppercase font-bold text-white inline-flex items-center gap-1"
                        >
                          <Layers className="w-3 h-3" /> View Chunks
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => onDeleteSource(src.id)}
                          className="p-1.5 text-[#555555] hover:text-rose-400 border border-[#1c1c1e] hover:border-rose-900/50 rounded transition-all"
                          title="Teardown Index & Delete Chunks"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#555555] font-mono text-xs">
                    No documents ingested yet. Upload a PDF, Markdown, or Text file to start semantic chunking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Chunks Modal */}
      <AnimatePresence>
        {inspectingSource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111113] border border-[#1c1c1e] rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-5 border-b border-[#1c1c1e] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-400" />
                    {inspectingSource.name}
                  </h3>
                  <p className="text-[10px] text-[#888888] font-mono mt-0.5">
                    {sourceChunks.length} Semantic Chunks • Target Model: {inspectingSource.embeddingModel || "bge-large-en-v1.5"}
                  </p>
                </div>
                <button
                  onClick={() => setInspectingSource(null)}
                  className="p-1.5 text-[#555555] hover:text-white rounded border border-transparent hover:border-[#1c1c1e]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 font-mono text-xs">
                {isLoadingChunks ? (
                  <div className="p-8 text-center text-[#888888] space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-400" />
                    <p className="text-xs">Loading chunks from database...</p>
                  </div>
                ) : sourceChunks.length > 0 ? (
                  sourceChunks.map((chunk, idx) => (
                    <div
                      key={chunk.id || idx}
                      className="p-3 bg-black border border-[#1c1c1e] rounded hover:border-[#2c2c2e] transition-colors space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-[9px] text-[#666666]">
                        <span className="font-bold uppercase tracking-wider text-sky-400">
                          Chunk #{chunk.chunkIndex + 1}
                        </span>
                        <span className="text-[#555555]">{chunk.chunkText.length} characters</span>
                      </div>
                      <p className="text-[#cccccc] font-sans text-xs leading-relaxed whitespace-pre-wrap">
                        {chunk.chunkText}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[#666666]">
                    No chunks available for this source.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
