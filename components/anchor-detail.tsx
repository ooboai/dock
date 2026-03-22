"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AuthorTypeBadge } from "@/components/author-type-badge";
import { ChevronRight } from "lucide-react";

interface AnchorPayload {
  anchor?: {
    contributors?: Array<{ name: string; role: string; model?: string }>;
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
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDurationSecs(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

function formatDurationMs(ms: number): string {
  return formatDurationSecs(Math.round(ms / 1000));
}

function formatFullDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AttributionBadge({ attribution }: { attribution: string }) {
  const styles: Record<string, string> = {
    ai: "bg-accent text-accent-foreground border-border",
    human: "bg-muted text-muted-foreground border-border",
    mixed: "bg-muted text-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${styles[attribution] ?? ""}`}>
      {attribution}
    </Badge>
  );
}

function FileRoleBadge({ role }: { role: "writer" | "reader" | "both" }) {
  const labels: Record<string, string> = { writer: "write", reader: "read", both: "read+write" };
  return (
    <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
      {labels[role] ?? role}
    </Badge>
  );
}

type SessionEntry = NonNullable<NonNullable<AnchorPayload["anchor"]>["sessions"]>[number];

function aggregateStats(sessions: SessionEntry[]) {
  let inputTokens = 0, outputTokens = 0, toolCalls = 0, toolFailures = 0;
  let duration = 0, thinkingMs = 0, subagents = 0;
  const models = new Set<string>();
  const agents = new Set<string>();
  const toolUsage: Record<string, number> = {};

  for (const s of sessions) {
    inputTokens += s.input_tokens ?? 0;
    outputTokens += s.output_tokens ?? 0;
    toolCalls += s.tool_calls ?? 0;
    toolFailures += s.tool_failures ?? 0;
    duration += s.duration_secs ?? 0;
    thinkingMs += s.thinking_duration_ms ?? 0;
    subagents += s.subagent_count ?? 0;
    if (s.model) models.add(s.model);
    if (s.agent) agents.add(s.agent);
    if (s.tool_usage) {
      for (const [name, count] of Object.entries(s.tool_usage)) {
        toolUsage[name] = (toolUsage[name] ?? 0) + count;
      }
    }
  }

  return {
    inputTokens, outputTokens, totalTokens: inputTokens + outputTokens,
    toolCalls, toolFailures, duration, thinkingMs, subagents,
    models: [...models], agents: [...agents], toolUsage,
    sessionCount: sessions.length,
  };
}

export function AnchorDetail({ payload, committedAt }: AnchorDetailProps) {
  const anchor = payload.anchor;
  if (!anchor) return null;

  const allSessions = anchor.sessions ?? [];
  const stats = aggregateStats(allSessions);
  const rootSessions = allSessions.filter((s) => !s.is_subagent);
  const subagentSessions = allSessions.filter((s) => s.is_subagent);
  const toolUsageEntries = Object.entries(stats.toolUsage).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      {/* Date + Contributors (compact row) */}
      <div className="flex items-center gap-3 flex-wrap">
        {committedAt && (
          <span className="text-xs text-muted-foreground/60">{formatFullDate(committedAt)}</span>
        )}
        {anchor.contributors && anchor.contributors.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground/40">·</span>
            {anchor.contributors.map((c, i) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                <span>{c.name}</span>
                <AuthorTypeBadge type={c.role === "agent" ? "agent" : "human"} />
                {c.model && <span className="text-muted-foreground">({c.model})</span>}
              </div>
            ))}
          </>
        )}
      </div>

      {/* AI Summary Stats */}
      {allSessions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCell label="Tokens" value={formatNumber(stats.totalTokens)} sub={`${formatNumber(stats.inputTokens)} in · ${formatNumber(stats.outputTokens)} out`} />
          {stats.duration > 0 && <StatCell label="Duration" value={formatDurationSecs(stats.duration)} />}
          {stats.toolCalls > 0 && <StatCell label="Tool Calls" value={stats.toolCalls.toLocaleString()} sub={stats.toolFailures > 0 ? `${stats.toolFailures} failed` : undefined} />}
          {stats.thinkingMs > 0 && <StatCell label="Thinking" value={formatDurationMs(stats.thinkingMs)} />}
          {stats.models.length > 0 && <StatCell label={stats.models.length === 1 ? "Model" : "Models"} value={stats.models.join(", ")} />}
          {stats.agents.length > 0 && <StatCell label={stats.agents.length === 1 ? "Agent" : "Agents"} value={stats.agents.join(", ")} />}
          {stats.subagents > 0 && <StatCell label="Subagents" value={stats.subagents.toLocaleString()} />}
          {stats.sessionCount > 1 && <StatCell label="Sessions" value={stats.sessionCount.toLocaleString()} />}
        </div>
      )}

      {/* Tool Usage Breakdown */}
      {toolUsageEntries.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {toolUsageEntries.map(([name, count]) => (
            <span key={name}>{name} <span className="font-medium text-foreground/70">{count}</span></span>
          ))}
        </div>
      )}

      {/* Sessions (when multiple, show per-session breakdown) */}
      {allSessions.length > 1 && (
        <div>
          <h4 className="text-sm font-heading font-semibold mb-2">Sessions</h4>
          <div className="space-y-2">
            {rootSessions.map((s, i) => (
              <SessionCard key={i} session={s} allSubagents={subagentSessions} depth={0} />
            ))}
            {subagentSessions
              .filter((sub) => !allSessions.some((r) => r.session_id === sub.parent_session_id))
              .map((s, i) => (
                <SessionCard key={`orphan-${i}`} session={s} allSubagents={subagentSessions} depth={0} />
              ))}
          </div>
        </div>
      )}

      {/* File Changes (collapsible) */}
      {anchor.file_changes && anchor.file_changes.length > 0 && (
        <CollapsibleFileChanges files={anchor.file_changes} />
      )}

      {/* File Interactions */}
      {anchor.file_interactions && anchor.file_interactions.length > 0 && (
        <div>
          <h4 className="text-sm font-heading font-semibold mb-2">File Interactions</h4>
          <div className="space-y-2">
            {anchor.file_interactions.map((fi, i) => (
              <div key={i} className="rounded-md bg-background border px-3 py-2">
                <div className="text-sm font-mono truncate mb-1">{fi.path}</div>
                <div className="flex flex-wrap gap-2">
                  {fi.sessions.map((s, j) => (
                    <div key={j} className="flex items-center gap-1.5 text-xs">
                      <code className="text-muted-foreground">{s.session_id.slice(0, 8)}</code>
                      <FileRoleBadge role={s.role} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md bg-background border px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-heading font-semibold truncate">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

function CollapsibleFileChanges({ files }: { files: NonNullable<AnchorPayload["anchor"]>["file_changes"] & object }) {
  const [open, setOpen] = useState(false);
  const totalAdded = files.reduce((sum, f) => sum + f.added, 0);
  const totalDeleted = files.reduce((sum, f) => sum + f.deleted, 0);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-heading font-semibold hover:text-foreground/80 transition-colors"
      >
        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
        <span>Files Changed</span>
        <span className="text-xs font-normal text-muted-foreground">
          {files.length} file{files.length !== 1 ? "s" : ""}
          <span className="ml-1.5 text-oobo-green">+{totalAdded}</span>
          <span className="ml-1 text-destructive">-{totalDeleted}</span>
        </span>
      </button>
      {open && (
        <div className="space-y-1 mt-2 ml-5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-xs font-mono py-0.5">
              <span className="flex-1 truncate text-muted-foreground">{f.path}</span>
              <span className="text-oobo-green">+{f.added}</span>
              <span className="text-destructive">-{f.deleted}</span>
              <AttributionBadge attribution={f.attribution} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MAX_NESTING_DEPTH = 5;

function SessionCard({
  session: s,
  allSubagents,
  depth,
}: {
  session: SessionEntry;
  allSubagents: SessionEntry[];
  depth: number;
}) {
  const children = depth < MAX_NESTING_DEPTH
    ? allSubagents.filter((sub) => sub.parent_session_id === s.session_id)
    : [];

  return (
    <div>
      <div className={`flex flex-wrap items-center gap-3 rounded-md bg-background border px-3 py-2 text-sm ${s.is_subagent ? "ml-6 border-dashed" : ""}`}>
        <code className="text-xs text-muted-foreground">{s.session_id.slice(0, 8)}</code>
        <span className="font-medium">{s.agent}</span>
        {s.model && <span className="text-xs text-muted-foreground">{s.model}</span>}
        {s.link_type && (
          <Badge variant="outline" className="text-xs">{s.link_type}</Badge>
        )}
        {s.is_subagent && (
          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
            ↳ {s.subagent_type ?? "subagent"}
          </Badge>
        )}
        {s.subagent_count != null && s.subagent_count > 0 && (
          <span className="text-xs text-muted-foreground">{s.subagent_count} subagent{s.subagent_count > 1 ? "s" : ""}</span>
        )}

        <div className="ml-auto flex flex-wrap gap-3 text-xs text-muted-foreground">
          {s.input_tokens != null && <span>{formatNumber(s.input_tokens)} in</span>}
          {s.output_tokens != null && <span>{formatNumber(s.output_tokens)} out</span>}
          {s.duration_secs != null && <span>{formatDurationSecs(s.duration_secs)}</span>}
          {s.tool_calls != null && <span>{s.tool_calls} calls</span>}
          {s.thinking_duration_ms != null && <span>{formatDurationMs(s.thinking_duration_ms)} thinking</span>}
        </div>
      </div>

      {children.length > 0 && (
        <div className="space-y-2 mt-2">
          {children.map((sub, j) => (
            <SessionCard key={j} session={sub} allSubagents={allSubagents} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
