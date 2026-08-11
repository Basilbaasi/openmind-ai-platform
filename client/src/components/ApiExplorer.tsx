import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Send,
  Database,
  History,
  Clock,
  Zap,
  Lock,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { ApiRequestLog } from "../types";

interface ApiExplorerProps {
  logs: ApiRequestLog[];
  onAddLog: (log: ApiRequestLog) => void;
  onClearLogs: () => void;
}

export default function ApiExplorer({
  logs,
  onAddLog,
  onClearLogs
}: ApiExplorerProps) {
  const [selectedLogId, setSelectedLogId] = useState<string>(logs[0]?.id || "");
  const currentLog = logs.find((l) => l.id === selectedLogId) || logs[0];

  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("POST");
  const [url, setUrl] = useState("https://api.openmind.ai/v1/chat/completions");
  const [activeTab, setActiveTab] = useState<"headers" | "body" | "auth">("body");
  const [requestHeaders, setRequestHeaders] = useState<string>(
    JSON.stringify(
      {
        "Content-Type": "application/json",
        "Authorization": "Bearer om_prod_k49ex"
      },
      null,
      2
    )
  );
  const [requestBody, setRequestBody] = useState<string>(
    JSON.stringify(
      {
        model: "llama3-8b-instruct",
        messages: [{ role: "user", content: "Introduce neural networks." }],
        temperature: 0.7
      },
      null,
      2
    )
  );

  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseSize, setResponseSize] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  // Load a historic log into the active workspace editor
  const handleLoadLog = (log: ApiRequestLog) => {
    setSelectedLogId(log.id);
    setMethod(log.method as any);
    setUrl(log.url);
    setRequestHeaders(JSON.stringify(log.requestHeaders, null, 2));
    setRequestBody(log.requestBody);
    setResponseStatus(log.status);
    setResponseTime(log.timeMs);
    setResponseSize(log.sizeBytes);
    setResponseBody(log.responseBody);
  };

  const handleSendRequest = async () => {
    setIsSending(true);
    setResponseStatus(null);
    setResponseTime(null);
    setResponseSize(null);
    setResponseBody("");

    const startTime = Date.now();

    try {
      // Parse request body and headers
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(requestBody);
      } catch (e) {
        // Fallback or string body
      }

      let headersObj: Record<string, string> = {};
      try {
        headersObj = JSON.parse(requestHeaders);
      } catch (e) {
        // Fallback
      }

      // If they are testing chat completion, proxy to our actual /api/chat!
      if (
        url.includes("/chat/completions") &&
        method === "POST" &&
        (parsedBody as any).messages
      ) {
        const response = await fetch("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: (parsedBody as any).messages,
            temperature: (parsedBody as any).temperature || 0.7
          })
        });

        const data = await response.json();
        const endTime = Date.now();
        const elapsed = endTime - startTime;

        if (response.ok && !data.error) {
          const finalResponse = {
            id: "chatcmpl-" + Math.random().toString(16).substring(2, 10),
            object: "chat.completion",
            created: Math.floor(endTime / 1000),
            model: "llama3-8b-instruct",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: data.message?.content || data.content || ""
                },
                finish_reason: "stop"
              }
            ],
            usage: data.usage || { prompt_tokens: 15, completion_tokens: 65, total_tokens: 80 }
          };

          const formattedRes = JSON.stringify(finalResponse, null, 2);
          setResponseStatus(200);
          setResponseTime(elapsed);
          setResponseSize(formattedRes.length);
          setResponseBody(formattedRes);

          // Save to history
          onAddLog({
            id: "req_" + Date.now(),
            method,
            url,
            status: 200,
            timeMs: elapsed,
            sizeBytes: formattedRes.length,
            timestamp: new Date().toISOString(),
            requestHeaders: headersObj,
            requestBody,
            responseBody: formattedRes
          });
        } else {
          const errorRes = {
            error: {
              message: data.error || "Execution failed on server.",
              type: "server_error"
            }
          };
          const formattedErr = JSON.stringify(errorRes, null, 2);
          setResponseStatus(response.status);
          setResponseTime(elapsed);
          setResponseSize(formattedErr.length);
          setResponseBody(formattedErr);
        }
      } else {
        // Simulate high-fidelity, polished, and interesting mock API calls if testing arbitrary URLs!
        setTimeout(() => {
          const endTime = Date.now();
          const elapsed = endTime - startTime;
          let status = 200;
          let mockRes: any = {};

          if (url.includes("/models")) {
            mockRes = {
              object: "list",
              data: [
                { id: "llama3-8b-instruct", object: "model", created: 1782342000, owned_by: "meta" },
                { id: "deepseek-r1-7b", object: "model", created: 1782343000, owned_by: "deepseek" },
                { id: "nvidia-ising-1.5-31b", object: "model", created: 1782344000, owned_by: "nvidia" }
              ]
            };
          } else if (url.includes("/embeddings")) {
            mockRes = {
              object: "list",
              data: [
                {
                  object: "embedding",
                  embedding: Array.from({ length: 8 }, () => Math.random().toFixed(4)),
                  index: 0
                }
              ],
              model: "bge-large-en-v1.5",
              usage: { prompt_tokens: 5, total_tokens: 5 }
            };
          } else {
            status = 404;
            mockRes = {
              error: {
                message: `Route '${url}' not found. Try '/v1/chat/completions' or '/v1/models'.`,
                type: "invalid_request_error"
              }
            };
          }

          const formattedRes = JSON.stringify(mockRes, null, 2);
          setResponseStatus(status);
          setResponseTime(elapsed);
          setResponseSize(formattedRes.length);
          setResponseBody(formattedRes);

          // Save to history
          onAddLog({
            id: "req_" + Date.now(),
            method,
            url,
            status,
            timeMs: elapsed,
            sizeBytes: formattedRes.length,
            timestamp: new Date().toISOString(),
            requestHeaders: headersObj,
            requestBody,
            responseBody: formattedRes
          });
        }, 600);
      }
    } catch (err: any) {
      const endTime = Date.now();
      const elapsed = endTime - startTime;
      const errorRes = {
        error: {
          message: err.message || "Failed to reach host.",
          type: "network_error"
        }
      };
      const formattedErr = JSON.stringify(errorRes, null, 2);
      setResponseStatus(500);
      setResponseTime(elapsed);
      setResponseSize(formattedErr.length);
      setResponseBody(formattedErr);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div id="api-explorer-view" className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
      {/* Historic Logs Panel */}
      <div className="bg-[#111113] border border-[#1c1c1e] rounded-lg p-4 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1c1c1e]">
          <h2 className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-white flex items-center gap-1.5">
            <History className="w-4 h-4 text-white" />
            Request History
          </h2>
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="text-[9px] uppercase font-bold tracking-wider text-[#888888] hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {logs.map((log) => {
            const isSelected = log.id === selectedLogId;
            const statusColor =
              log.status >= 200 && log.status < 300
                ? "text-white bg-white/5 border-white/10"
                : "text-rose-400 bg-rose-500/5 border-rose-500/10";
            
            const methodColors = "text-white bg-[#161618] border-[#2c2c2e]";

            return (
              <div
                key={log.id}
                onClick={() => handleLoadLog(log)}
                className={`p-2.5 rounded cursor-pointer border transition-all ${
                  isSelected
                    ? "bg-[#161618] border-[#2c2c2e]"
                    : "bg-[#0a0a0b]/60 border-[#1c1c1e] hover:border-[#2c2c2e]"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono border uppercase tracking-wider font-semibold ${methodColors}`}>
                    {log.method}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono border font-bold uppercase tracking-wider ${statusColor}`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-[10px] text-[#888888] font-mono truncate mt-2">
                  {log.url.replace("https://api.openmind.ai", "")}
                </p>
                <div className="flex items-center justify-between text-[8px] text-[#555555] font-mono mt-1.5 uppercase tracking-wider">
                  <span>{log.timeMs}ms</span>
                  <span>{log.sizeBytes} B</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workspace Panel */}
      <div className="lg:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
        {/* URL Address Bar */}
        <div className="bg-[#111113] border border-[#1c1c1e] p-3 rounded-lg flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center w-full sm:flex-1 border border-[#1c1c1e] rounded overflow-hidden bg-black focus-within:border-white transition-colors">
            <select
              id="api-method-select"
              value={method}
              onChange={(e: any) => setMethod(e.target.value)}
              className="bg-[#111113] text-xs border-r border-[#1c1c1e] p-2.5 font-mono text-white focus:outline-none"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              id="api-url-input"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-transparent text-xs p-2.5 w-full font-mono text-white focus:outline-none"
            />
          </div>

          <button
            id="api-send-request"
            onClick={handleSendRequest}
            disabled={isSending}
            className={`w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-[11px] font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5 ${
              isSending ? "opacity-70 cursor-wait" : ""
            }`}
          >
            {isSending ? (
              <>
                <Zap className="w-4 h-4 animate-spin text-black" /> Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-black" /> Send Request
              </>
            )}
          </button>
        </div>

        {/* Double-Panel: Left Editor, Right Response */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Request Config Column */}
          <div className="bg-[#111113] border border-[#1c1c1e] rounded-lg p-4 flex flex-col h-full overflow-hidden">
            {/* Headers/Body/Auth tabs */}
            <div className="flex border-b border-[#1c1c1e] mb-3 gap-2">
              <button
                onClick={() => setActiveTab("body")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider px-2 transition-colors relative ${
                  activeTab === "body" ? "text-white" : "text-[#888888] hover:text-white"
                }`}
              >
                Body JSON
                {activeTab === "body" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("headers")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider px-2 transition-colors relative ${
                  activeTab === "headers" ? "text-white" : "text-[#888888] hover:text-white"
                }`}
              >
                Headers
                {activeTab === "headers" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("auth")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider px-2 transition-colors relative ${
                  activeTab === "auth" ? "text-white" : "text-[#888888] hover:text-white"
                }`}
              >
                Auth
                {activeTab === "auth" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                )}
              </button>
            </div>

            <div className="flex-1 min-h-0">
              {activeTab === "body" && (
                <textarea
                  id="api-body-textarea"
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full h-full bg-black font-mono text-[11px] p-3 text-white border border-[#1c1c1e] hover:border-[#2c2c2e] focus:border-white focus:outline-none rounded resize-none"
                />
              )}
              {activeTab === "headers" && (
                <textarea
                  id="api-headers-textarea"
                  value={requestHeaders}
                  onChange={(e) => setRequestHeaders(e.target.value)}
                  className="w-full h-full bg-black font-mono text-[11px] p-3 text-white border border-[#1c1c1e] hover:border-[#2c2c2e] focus:border-white focus:outline-none rounded resize-none"
                />
              )}
              {activeTab === "auth" && (
                <div className="space-y-4 p-2 text-xs">
                  <div className="flex items-start gap-2.5 bg-white/[0.02] border border-[#1c1c1e] p-3.5 rounded text-[#888888] text-[11px] leading-relaxed">
                    <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-white" />
                    <p>
                      This console uses Bearer Token authentication. API tokens are managed in{" "}
                      <span className="font-bold text-white uppercase tracking-wider text-[9px]">Settings &gt; API Management</span>.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-[#888888] uppercase tracking-wider font-bold">
                      Bearer Authorization Prefix
                    </label>
                    <input
                      type="text"
                      disabled
                      value="om_prod_k49ex•••••••••••••"
                      className="w-full bg-black text-xs p-2.5 border border-[#1c1c1e] text-[#555555] font-mono rounded cursor-not-allowed"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Response Viewer Column */}
          <div className="bg-[#111113] border border-[#1c1c1e] rounded-lg p-4 flex flex-col h-full overflow-hidden">
            {/* Stats Header */}
            <div className="flex items-center justify-between border-b border-[#1c1c1e] pb-2 mb-3">
              <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-white">
                Response View
              </h3>

              {responseStatus && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#888888] flex items-center gap-1 font-mono uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-[#555555]" />
                    {responseTime} ms
                  </span>
                  <span className="text-[10px] text-[#888888] font-mono uppercase tracking-wider">
                    {responseSize} B
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                      responseStatus >= 200 && responseStatus < 300
                        ? "text-white bg-white/5 border-white/10"
                        : "text-rose-400 bg-rose-500/5 border-rose-500/10"
                    }`}
                  >
                    STATUS: {responseStatus}
                  </span>
                </div>
              )}
            </div>

            {/* Response JSON Viewer */}
            <div className="flex-1 min-h-0 bg-black border border-[#1c1c1e] rounded p-3 overflow-auto font-mono text-[11px] text-[#cccccc]">
              {responseBody ? (
                <pre className="whitespace-pre-wrap">{responseBody}</pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-[#555555]">
                  <Database className="w-6 h-6 text-[#555555] mb-2" />
                  <p className="text-xs font-bold text-[#888888] font-serif italic">Awaiting Request Execution</p>
                  <p className="text-[10px] text-[#555555] mt-1 max-w-xs">
                    Click 'Send Request' to execute or load a history element from the system logs.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
