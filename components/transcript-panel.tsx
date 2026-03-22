"use client";

import { useState } from "react";
import { X, ChevronRight, Terminal, CheckCircle2, XCircle } from "lucide-react";
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

function ToolCallBlock({ m }: { m: TranscriptMessage }) {
  const [open, setOpen] = useState(false);
  const name = m.tool_call?.name ?? "unknown";
  const summary = m.tool_call?.input_summary ?? "";

  return (
    <div className="rounded border bg-muted/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-mono text-left hover:bg-muted/50 transition-colors"
      >
        <ChevronRight className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <Terminal className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="font-semibold text-foreground">{name}</span>
        {!open && summary && (
          <span className="text-muted-foreground truncate ml-1">{summary}</span>
        )}
      </button>
      {open && summary && (
        <div className="px-2.5 pb-2 pt-0.5 text-xs text-muted-foreground whitespace-pre-wrap wrap-break-word border-t border-border/50 mx-2.5 mt-0.5">
          {summary}
        </div>
      )}
    </div>
  );
}

function ToolResultBlock({ m }: { m: TranscriptMessage }) {
  const [open, setOpen] = useState(false);
  const name = m.tool_result?.name ?? "unknown";
  const succeeded = m.tool_result?.success === true;
  const output = m.tool_result?.output_summary;

  return (
    <div className="rounded border bg-muted/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-mono text-left hover:bg-muted/50 transition-colors"
      >
        <ChevronRight className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        {succeeded
          ? <CheckCircle2 className="h-3 w-3 text-oobo-green shrink-0" />
          : <XCircle className="h-3 w-3 text-destructive shrink-0" />
        }
        <span className={`font-semibold ${succeeded ? "text-foreground" : "text-destructive"}`}>{name}</span>
        <span className={`text-muted-foreground ${succeeded ? "" : "text-destructive"}`}>{succeeded ? "ok" : "failed"}</span>
        {!open && output && (
          <span className="text-muted-foreground truncate ml-1">— {output}</span>
        )}
      </button>
      {open && output && (
        <div className="px-2.5 pb-2 pt-0.5 text-xs text-muted-foreground whitespace-pre-wrap wrap-break-word border-t border-border/50 mx-2.5 mt-0.5">
          {output}
        </div>
      )}
    </div>
  );
}

function ThinkingBlock({ m }: { m: TranscriptMessage }) {
  const [open, setOpen] = useState(false);
  const text = m.thinking ?? "";

  return (
    <div className="rounded border bg-muted/20">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-left hover:bg-muted/30 transition-colors"
      >
        <ChevronRight className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="text-muted-foreground italic">Thinking…</span>
      </button>
      {open && (
        <div className="px-2.5 pb-2 pt-0.5 text-xs text-muted-foreground italic whitespace-pre-wrap wrap-break-word border-t border-border/50 mx-2.5 mt-0.5">
          {text}
        </div>
      )}
    </div>
  );
}

function TextMessage({ m }: { m: TranscriptMessage }) {
  const isAssistant = m.role === "assistant";
  const timestamp = m.timestamp_ms
    ? new Date(m.timestamp_ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className={`flex items-start gap-2 py-1.5 px-2.5 text-sm ${isAssistant ? "bg-accent/30 rounded" : ""}`}>
      <span className="text-xs font-semibold shrink-0 mt-0.5 w-16 text-muted-foreground">
        {m.role}
      </span>
      <span className="text-foreground/80 min-w-0 flex-1 whitespace-pre-wrap wrap-break-word">{m.text}</span>
      {timestamp && <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{timestamp}</span>}
    </div>
  );
}

function MessageLine({ m }: { m: TranscriptMessage }) {
  if (m.tool_call) return <ToolCallBlock m={m} />;
  if (m.tool_result) return <ToolResultBlock m={m} />;
  if (m.thinking) return <ThinkingBlock m={m} />;
  if (m.text) return <TextMessage m={m} />;
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

        {/* Filter tabs */}
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
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
