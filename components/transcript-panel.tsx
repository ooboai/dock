"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { TranscriptMessage } from "@/lib/types";

function transcriptStats(messages: TranscriptMessage[]) {
  let text = 0, toolCalls = 0, thinking = 0;
  for (const m of messages) {
    if (m.tool_call) toolCalls++;
    else if (m.thinking) thinking++;
    else if (m.text) text++;
  }
  return { text, toolCalls, thinking, total: messages.length };
}

function MessageLine({ m }: { m: TranscriptMessage }) {
  const timestamp = m.timestamp_ms
    ? new Date(m.timestamp_ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  if (m.tool_call) {
    const name = m.tool_call.name ?? "unknown";
    const summary = m.tool_call.input_summary ?? "";
    return (
      <div className="flex items-start gap-2 py-1 px-2.5 rounded bg-muted/50 font-mono text-xs">
        <span className="text-muted-foreground shrink-0 mt-0.5">→</span>
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-foreground">{name}</span>
          {summary && <span className="text-muted-foreground ml-1">({summary.slice(0, 300)}{summary.length > 300 ? "…" : ""})</span>}
        </div>
        {timestamp && <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{timestamp}</span>}
      </div>
    );
  }

  if (m.tool_result) {
    const name = m.tool_result.name ?? "unknown";
    const succeeded = m.tool_result.success === true;
    return (
      <div className="flex items-start gap-2 py-1 px-2.5 rounded bg-muted/50 font-mono text-xs">
        <span className="text-muted-foreground shrink-0 mt-0.5">←</span>
        <div className="min-w-0 flex-1">
          <span className={`font-semibold ${succeeded ? "text-foreground" : "text-destructive"}`}>{name}</span>
          <span className={`ml-1 ${succeeded ? "text-muted-foreground" : "text-destructive"}`}>{succeeded ? "ok" : "failed"}</span>
          {m.tool_result.output_summary && (
            <span className="text-muted-foreground"> — {m.tool_result.output_summary.slice(0, 300)}{m.tool_result.output_summary.length > 300 ? "…" : ""}</span>
          )}
        </div>
        {timestamp && <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{timestamp}</span>}
      </div>
    );
  }

  if (m.thinking) {
    return (
      <div className="flex items-start gap-2 py-1 px-2.5 rounded bg-muted/30 text-xs">
        <span className="text-muted-foreground shrink-0 mt-0.5 italic text-[10px]">think</span>
        <span className="text-muted-foreground italic min-w-0 flex-1">{m.thinking.slice(0, 500)}{m.thinking.length > 500 ? "…" : ""}</span>
        {timestamp && <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{timestamp}</span>}
      </div>
    );
  }

  if (m.text) {
    const isAssistant = m.role === "assistant";
    return (
      <div className={`flex items-start gap-2 py-1.5 px-2.5 text-sm ${isAssistant ? "bg-accent/30 rounded" : ""}`}>
        <span className="text-xs font-semibold shrink-0 mt-0.5 w-16 text-muted-foreground">
          {m.role}
        </span>
        <span className="text-foreground/80 min-w-0 flex-1">{m.text.slice(0, 500)}{m.text.length > 500 ? "…" : ""}</span>
        {timestamp && <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{timestamp}</span>}
      </div>
    );
  }

  return null;
}

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
  commitHash: string;
  commitMessage: string | null;
  onClose: () => void;
}

export function TranscriptPanel({ messages, commitHash, commitMessage, onClose }: TranscriptPanelProps) {
  const [filter, setFilter] = useState<"all" | "text" | "tools" | "thinking">("all");
  const stats = transcriptStats(messages);

  const filtered = messages.filter((m) => {
    if (filter === "all") return m.text || m.tool_call || m.tool_result || m.thinking;
    if (filter === "text") return m.text;
    if (filter === "tools") return m.tool_call || m.tool_result;
    if (filter === "thinking") return m.thinking;
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-heading font-semibold truncate">
              Transcript
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              <code>{commitHash.slice(0, 7)}</code>
              {commitMessage && <span className="ml-1.5">{commitMessage}</span>}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors ml-3">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Filter tabs + stats */}
        <div className="flex items-center gap-1 px-4 py-2 border-b shrink-0 text-xs">
          {(["all", "text", "tools", "thinking"] as const).map((f) => {
            const count = f === "all" ? stats.total : f === "text" ? stats.text : f === "tools" ? stats.toolCalls : stats.thinking;
            if (f !== "all" && count === 0) return null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-md transition-colors ${filter === f ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}
              >
                {f === "all" ? "All" : f === "text" ? "Messages" : f === "tools" ? "Tools" : "Thinking"}
                <span className="ml-1 text-[10px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filtered.map((m, i) => (
            <MessageLine key={i} m={m} />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No messages match this filter</p>
          )}
        </div>
      </div>
    </>
  );
}
