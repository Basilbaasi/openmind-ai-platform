import React, { useState } from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  Download,
  Clock,
  Layers,
  Cpu,
  TrendingUp,
  Zap,
  Activity,
  Award,
  CheckCircle2
} from "lucide-react";
import { BenchmarkResult } from "../types";

interface BenchmarksProps {
  benchmarks: BenchmarkResult[];
}

export default function Benchmarks({ benchmarks }: BenchmarksProps) {
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("24h");
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportCSV = () => {
    // Generate actual high-fidelity CSV format of benchmarks and download it
    const headers = "Model Name,TTFT (ms),Speed (TPS),Latency (ms),Accuracy (%),VRAM (GB),Cost per 1k tokens\n";
    const rows = benchmarks
      .map(
        (b) =>
          `"${b.modelName}",${b.ttftMs},${b.tps},${b.latencyMs},${b.accuracy},${b.vramGb},${b.costPer1k}`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openmind_benchmarks_${timeframe}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  // Peak metrics calculation
  const topTpsModel = [...benchmarks].sort((a, b) => b.tps - a.tps)[0];
  const lowestLatencyModel = [...benchmarks].sort((a, b) => a.latencyMs - b.latencyMs)[0];

  return (
    <div id="benchmarks-view" className="space-y-6">
      {/* Top filter section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111113] border border-[#1c1c1e] p-4 rounded">
        <div className="flex items-center gap-2">
          {["24h", "7d", "30d"].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t as any)}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded transition-colors ${
                timeframe === t
                  ? "bg-white text-black"
                  : "bg-black text-[#888888] hover:text-white border border-[#1c1c1e]"
              }`}
            >
              Last {t}
            </button>
          ))}
        </div>

        <button
          id="export-csv-btn"
          onClick={handleExportCSV}
          className="w-full sm:w-auto px-4 py-2 bg-black hover:bg-white text-[#888888] hover:text-black border border-[#1c1c1e] hover:border-white text-[10px] font-sans font-bold uppercase tracking-widest rounded transition-all flex items-center justify-center gap-1.5"
        >
          {exportSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" /> Exported!
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Export CSV Metrics
            </>
          )}
        </button>
      </div>

      {/* Grid: Global KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Global TPS Card */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded">
          <div className="flex items-center justify-between text-[#888888] mb-2">
            <span className="text-[9px] font-sans font-bold uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-white" />
              Peak Generation Speed
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-sans font-bold text-white">{topTpsModel?.tps}</span>
            <span className="text-[10px] font-serif italic text-[#888888]">Tokens/sec ({topTpsModel?.modelName})</span>
          </div>
          <div className="w-full bg-black h-1 rounded mt-3.5 overflow-hidden">
            <div className="bg-white h-1 rounded" style={{ width: "84%" }} />
          </div>
        </div>

        {/* Global Latency Card */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded">
          <div className="flex items-center justify-between text-[#888888] mb-2">
            <span className="text-[9px] font-sans font-bold uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-white" />
              Optimal Latency Core
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-sans font-bold text-white">{lowestLatencyModel?.latencyMs} ms</span>
            <span className="text-[10px] font-serif italic text-[#888888]">Avg response ({lowestLatencyModel?.modelName})</span>
          </div>
          <div className="w-full bg-black h-1 rounded mt-3.5 overflow-hidden">
            <div className="bg-white h-1 rounded" style={{ width: "95%" }} />
          </div>
        </div>

        {/* Accuracy Benchmark Index */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded">
          <div className="flex items-center justify-between text-[#888888] mb-2">
            <span className="text-[9px] font-sans font-bold uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-white" />
              Highest Analytical Index
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-sans font-bold text-white">94.8%</span>
            <span className="text-[10px] font-serif italic text-[#888888]">Accuracy Score (GPT-4o)</span>
          </div>
          <div className="w-full bg-black h-1 rounded mt-3.5 overflow-hidden">
            <div className="bg-white h-1 rounded" style={{ width: "94%" }} />
          </div>
        </div>
      </div>

      {/* Grid: Latency distribution charts & resource efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latency Comparison Chart */}
        <div className="lg:col-span-2 bg-[#111113] border border-[#1c1c1e] p-5 rounded h-[340px] flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-white flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-white" />
              Response Time Distribution (ms)
            </h3>
            <p className="text-[10px] text-[#888888] mt-1 font-serif italic">
              Comparing average round-trip connection times (lower is faster).
            </p>
          </div>

          {/* SVG/CSS Bar Chart representation of Model Latency */}
          <div className="flex-1 flex items-end justify-between pt-6 px-4 gap-4 h-48 font-mono">
            {benchmarks.map((b) => {
              // Scale relative to max latency of 150ms
              const heightPct = Math.min((b.latencyMs / 140) * 100, 100);

              return (
                <div key={b.modelId} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <span className="text-[9px] font-bold font-mono text-[#888888] group-hover:text-white transition-colors">
                    {b.latencyMs}ms
                  </span>
                  <div className="w-full bg-black rounded h-28 relative overflow-hidden flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="w-full bg-white group-hover:bg-neutral-200 rounded"
                    />
                  </div>
                  <span className="text-[8px] text-[#555555] text-center truncate w-full uppercase tracking-wider font-mono">
                    {b.modelName.replace(" Instruct", "")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accuracy and speed trade-offs */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-5 rounded flex flex-col h-[340px] justify-between">
          <div>
            <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-white" />
              Efficiency Index Trade-off
            </h3>
            <p className="text-[10px] text-[#888888] mt-1 font-serif italic">
              Analyzing parameters vs generation speed bounds.
            </p>
          </div>

          <div className="space-y-4 flex-1 pt-4">
            {benchmarks.map((b) => (
              <div key={b.modelId} className="space-y-1">
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className="text-white font-bold">{b.modelName}</span>
                  <span className="text-[#888888]">{b.tps} TPS</span>
                </div>
                <div className="w-full bg-black h-1.5 rounded overflow-hidden">
                  <div
                    className="bg-white h-1.5 rounded"
                    style={{ width: `${(b.tps / 120) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-black border border-[#1c1c1e] rounded text-[10px] leading-relaxed text-[#888888] font-sans">
            Note: Quantized local partitions provide maximum throughput (TPS) speed without computing API payloads over public pipelines.
          </div>
        </div>
      </div>

      {/* Detailed comparison matrix */}
      <div className="bg-[#111113] border border-[#1c1c1e] rounded overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1c1c1e]">
          <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-white">
            Model Capability & Resource Matrix
          </h3>
          <p className="text-[10px] text-[#888888] mt-1 font-serif italic">
            Exhaustive indices across hardware sizes, pricing models, and accuracy scoring.
          </p>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1c1c1e] font-mono text-[9px] uppercase tracking-wider text-[#555555]">
                <th className="p-4">Model Partitions</th>
                <th className="p-4">TTFT (ms)</th>
                <th className="p-4">Speed (TPS)</th>
                <th className="p-4">Total latency</th>
                <th className="p-4">Accuracy rating</th>
                <th className="p-4">VRAM partition (GB)</th>
                <th className="p-4 text-right">Cost per 1k</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b) => (
                <tr key={b.modelId} className="border-b border-[#1c1c1e] hover:bg-[#161618]/30 transition-colors text-[#cccccc]">
                  <td className="p-4 font-bold text-white">{b.modelName}</td>
                  <td className="p-4 font-mono text-[10px]">{b.ttftMs} ms</td>
                  <td className="p-4 font-mono text-[10px] text-white font-bold">{b.tps} t/s</td>
                  <td className="p-4 font-mono text-[10px]">{b.latencyMs} ms</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-white font-bold">{b.accuracy}%</span>
                      <div className="w-12 bg-black h-1 rounded overflow-hidden">
                        <div className="bg-white h-1 rounded" style={{ width: `${b.accuracy}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-[10px] text-[#888888]">
                    {b.vramGb > 0 ? `${b.vramGb} GB` : "Cloud Hosted"}
                  </td>
                  <td className="p-4 text-right font-mono text-[10px] text-[#888888]">
                    {b.costPer1k > 0 ? `$${b.costPer1k.toFixed(6)}` : "Free / Local"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
