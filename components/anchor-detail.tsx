"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AuthorTypeBadge } from "@/components/author-type-badge";
import { Bot, ChevronRight } from "lucide-react";

interface AnchorPayload {
  anchor?: {
    contributors?: Array<{ name: string; role: string; model?: string }>;
    added?: number;
    deleted?: number;
    file_changes?: Array<{
      path: string;
      added: number;
      deleted: number;
      attribution: string;
      agent?: string;
    }>;
    sessions?: Array<{
      session_id: string;
      agent: string;
      model?: string;
      input_tokens?: number;
      output_tokens?: number;
      cache_read_tokens?: number;
      cache_creation_tokens?: number;
      duration_secs?: number;
      tool_calls?: number;
      link_type?: string;
      tool_usage?: Record<string, number>;
      tool_failures?: number;
      subagent_count?: number;
      bash_commands?: string[];
      thinking_duration_ms?: number;
      compact_count?: number;
      is_subagent?: boolean;
      parent_session_id?: string;
      subagent_type?: string;
      peer_session_ids?: string[];
      is_estimated?: boolean;
    }>;
    file_interactions?: Array<{
      path: string;
      sessions: Array<{
        session_id: string;
        role: "writer" | "reader" | "both";
      }>;
    }>;
  };
}

interface AnchorDetailProps {
  payload: AnchorPayload;
  committedAt?: string | null;
  branch?: string | null;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDuration(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

type SessionEntry = NonNullable<NonNullable<AnchorPayload["anchor"]>["sessions"]>[number];

function getSessionTotals(sessions: SessionEntry[]) {
  let inputTokens = 0, outputTokens = 0, duration = 0;
  let toolCalls = 0, thinkingMs = 0;
  const toolUsage: Record<string, number> = {};
  for (const s of sessions) {
    inputTokens += s.input_tokens ?? 0;
    outputTokens += s.output_tokens ?? 0;
    duration += s.duration_secs ?? 0;
    toolCalls += s.tool_calls ?? 0;
    thinkingMs += s.thinking_duration_ms ?? 0;
    if (s.tool_usage) {
      for (const [name, count] of Object.entries(s.tool_usage)) {
        toolUsage[name] = (toolUsage[name] ?? 0) + count;
      }
    }
  }
  const tokens = inputTokens + outputTokens;
  return { tokens, inputTokens, outputTokens, duration, toolCalls, thinkingMs, toolUsage };
}

export function AnchorDetail({ payload, committedAt, branch }: AnchorDetailProps) {
  const anchor = payload.anchor;
  if (!anchor) return null;

  const sessions = anchor.sessions ?? [];
  const primarySession = sessions.find((s) => !s.parent_session_id) || sessions[0];
  const subagentCount = sessions.filter((s) => s.is_subagent || s.parent_session_id).length;
  const totals = getSessionTotals(sessions);
  const toolUsageEntries = Object.entries(totals.toolUsage).sort(([, a], [, b]) => b - a);

  return (
    <div className="border-t border-border/50">
      {/* Agent line */}
      {primarySession && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 pt-2.5">
          <Bot className="h-3 w-3 shrink-0" />
          <span className="font-medium text-foreground">{primarySession.agent}</span>
          <span className="truncate">{primarySession.model}</span>
          {subagentCount > 0 && <span className="shrink-0">+ {subagentCount} sub</span>}
        </div>
      )}

      {/* Stats grid — two columns, no borders */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs px-3 py-2">
        {totals.tokens > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Tokens</span>
            <span className="text-foreground tabular-nums">
              {formatNumber(totals.tokens)}{" "}
              <span className="text-muted-foreground text-[10px]">
                {formatNumber(totals.inputTokens)}↑ {formatNumber(totals.outputTokens)}↓
              </span>
            </span>
          </div>
        )}
        {(anchor.added != null || anchor.deleted != null) && (
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Lines</span>
            <span className="tabular-nums">
              <span className="text-oobo-green">+{anchor.added ?? 0}</span>{" "}
              <span className="text-destructive">-{anchor.deleted ?? 0}</span>
            </span>
          </div>
        )}
        {totals.duration > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="text-foreground">{formatDuration(totals.duration)}</span>
          </div>
        )}
        {totals.toolCalls > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Tools</span>
            <span className="text-foreground tabular-nums">{totals.toolCalls}</span>
          </div>
        )}
        {totals.thinkingMs > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Thinking</span>
            <span className="text-foreground">{formatDuration(totals.thinkingMs / 1000)}</span>
          </div>
        )}
        {branch && (
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Branch</span>
            <span className="text-foreground font-mono truncate ml-2">{branch}</span>
          </div>
        )}
      </div>

      {/* Tool usage breakdown */}
      {toolUsageEntries.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground px-3 pb-2">
          {toolUsageEntries.map(([name, count]) => (
            <span key={name}>
              {name} <span className="font-medium text-foreground/60">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Collapsible sections */}
      {(anchor.file_changes?.length || sessions.length > 1) && (
        <div className="border-t border-border/50 px-3 py-2 space-y-1">
          {anchor.file_changes && anchor.file_changes.length > 0 && (
            <CollapsibleFileChanges files={anchor.file_changes} />
          )}
          {sessions.length > 1 && (
            <CollapsibleSessions sessions={sessions} />
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleFileChanges({
  files,
}: {
  files: NonNullable<NonNullable<AnchorPayload["anchor"]>["file_changes"]>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
        <span>{files.length} file{files.length !== 1 ? "s" : ""} changed</span>
      </button>
      {open && (
        <div className="mt-1 ml-4 space-y-px max-h-40 overflow-y-auto text-xs">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground truncate font-mono flex-1 min-w-0">{f.path}</span>
              <span className="ml-2 shrink-0 tabular-nums">
                <span className="text-oobo-green">+{f.added}</span>{" "}
                <span className="text-destructive">-{f.deleted}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleSessions({
  sessions,
}: {
  sessions: NonNullable<NonNullable<AnchorPayload["anchor"]>["sessions"]>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
        <span>{sessions.length} sessions</span>
      </button>
      {open && (
        <div className="mt-1 ml-4 space-y-px text-xs">
          {sessions.map((s, i) => (
            <div key={s.session_id || i} className={`flex items-center justify-between py-0.5 ${s.parent_session_id ? "pl-3" : ""}`}>
              <span className="text-foreground/80 min-w-0 truncate">
                {s.parent_session_id && <span className="text-accent-foreground mr-1">↳</span>}
                {s.agent} <span className="text-muted-foreground">{s.model}</span>
              </span>
              <span className="ml-2 shrink-0 text-muted-foreground tabular-nums">
                {(s.input_tokens ?? 0) + (s.output_tokens ?? 0) > 0 &&
                  `${formatNumber((s.input_tokens ?? 0) + (s.output_tokens ?? 0))} tok`}
                {(s.duration_secs ?? 0) > 0 && ` · ${formatDuration(s.duration_secs!)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
