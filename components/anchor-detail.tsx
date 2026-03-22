"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AuthorTypeBadge } from "@/components/author-type-badge";
import type { TranscriptMessage } from "@/lib/types";

export type { TranscriptMessage };

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
  transcript?: TranscriptMessage[];
  session_transcripts?: Array<{
    session_id: string;
    parent_session_id?: string;
    subagent_type?: string;
    messages: TranscriptMessage[];
  }>;
}

interface AnchorDetailProps {
  payload: AnchorPayload;
  hasTranscript: boolean;
  transcriptMessages?: TranscriptMessage[];
}

function AttributionBadge({ attribution }: { attribution: string }) {
  const styles: Record<string, string> = {
    ai: "bg-oobo-cyan/10 text-oobo-cyan border-oobo-cyan/20",
    human: "bg-oobo-teal/10 text-oobo-teal border-oobo-teal/20",
    mixed: "bg-oobo-yellow/10 text-oobo-yellow border-oobo-yellow/20",
  };
  return (
    <Badge variant="outline" className={styles[attribution] ?? ""}>
      {attribution}
    </Badge>
  );
}

function FileRoleBadge({ role }: { role: "writer" | "reader" | "both" }) {
  const styles: Record<string, string> = {
    writer: "bg-oobo-cyan/10 text-oobo-cyan border-oobo-cyan/20",
    reader: "bg-oobo-teal/10 text-oobo-teal border-oobo-teal/20",
    both: "bg-oobo-yellow/10 text-oobo-yellow border-oobo-yellow/20",
  };
  return (
    <Badge variant="outline" className={styles[role] ?? ""}>
      {role}
    </Badge>
  );
}

function formatToolUsage(usage: Record<string, number>): string {
  return Object.entries(usage)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => `${name}: ${count}`)
    .join(" · ");
}

function formatDuration(ms: number): string {
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function TranscriptMessageLine({ m, expanded }: { m: TranscriptMessage; expanded: boolean }) {
  const maxLen = expanded ? 500 : 200;
  const timestamp = m.timestamp_ms
    ? new Date(m.timestamp_ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  if (m.tool_call) {
    const name = m.tool_call.name ?? "unknown";
    const summary = m.tool_call.input_summary ?? "";
    const summaryMax = expanded ? 300 : 120;
    return (
      <div className="flex items-start gap-2 py-1 px-2 rounded bg-oobo-cyan/5 font-mono text-xs">
        <span className="text-oobo-cyan shrink-0 mt-0.5">→</span>
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-oobo-cyan">{name}</span>
          {summary && <span className="text-muted-foreground ml-1">({summary.slice(0, summaryMax)}{summary.length > summaryMax ? "…" : ""})</span>}
        </div>
        {timestamp && <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{timestamp}</span>}
      </div>
    );
  }

  if (m.tool_result) {
    const name = m.tool_result.name ?? "unknown";
    const succeeded = m.tool_result.success === true;
    return (
      <div className={`flex items-start gap-2 py-1 px-2 rounded font-mono text-xs ${succeeded ? "bg-oobo-teal/5" : "bg-oobo-red/5"}`}>
        <span className={`shrink-0 mt-0.5 ${succeeded ? "text-oobo-teal" : "text-oobo-red"}`}>←</span>
        <div className="min-w-0 flex-1">
          <span className={`font-semibold ${succeeded ? "text-oobo-teal" : "text-oobo-red"}`}>{name}</span>
          <span className="text-muted-foreground ml-1">{succeeded ? "ok" : "failed"}</span>
          {m.tool_result.output_summary && (
            <span className="text-muted-foreground"> — {m.tool_result.output_summary.slice(0, maxLen)}{m.tool_result.output_summary.length > maxLen ? "…" : ""}</span>
          )}
        </div>
        {timestamp && <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{timestamp}</span>}
      </div>
    );
  }

  if (m.thinking) {
    return (
      <div className="flex items-start gap-2 py-1 px-2 rounded bg-purple-500/5 text-xs">
        <span className="text-purple-400 shrink-0 mt-0.5 italic">💭</span>
        <span className="text-muted-foreground italic min-w-0 flex-1">{m.thinking.slice(0, maxLen)}{m.thinking.length > maxLen ? "…" : ""}</span>
        {timestamp && <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{timestamp}</span>}
      </div>
    );
  }

  if (m.text) {
    const isAssistant = m.role === "assistant";
    return (
      <div className="flex items-start gap-2 py-1.5 px-2 text-sm">
        <span className={`text-xs font-semibold shrink-0 mt-0.5 w-16 ${isAssistant ? "text-oobo-cyan" : "text-oobo-teal"}`}>
          {m.role}
        </span>
        <span className="text-foreground/80 min-w-0 flex-1">{m.text.slice(0, maxLen)}{m.text.length > maxLen ? "…" : ""}</span>
        {timestamp && <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{timestamp}</span>}
      </div>
    );
  }

  return null;
}

function transcriptStats(messages: TranscriptMessage[]) {
  let text = 0, toolCalls = 0, toolResults = 0, thinking = 0;
  for (const m of messages) {
    if (m.tool_call) toolCalls++;
    else if (m.tool_result) toolResults++;
    else if (m.thinking) thinking++;
    else if (m.text) text++;
  }
  return { text, toolCalls, toolResults, thinking, total: messages.length };
}

function TranscriptSection({ messages }: { messages: TranscriptMessage[] }) {
  const [expanded, setExpanded] = useState(false);
  const stats = transcriptStats(messages);
  const previewCount = 5;
  const shown = expanded ? messages : messages.slice(0, previewCount);
  const hasMore = messages.length > previewCount;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-heading font-semibold">Transcript</h4>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{stats.text} message{stats.text !== 1 ? "s" : ""}</span>
          {stats.toolCalls > 0 && <span>· {stats.toolCalls} tool call{stats.toolCalls !== 1 ? "s" : ""}</span>}
          {stats.thinking > 0 && <span>· {stats.thinking} thinking</span>}
        </div>
      </div>
      <div className={`space-y-0.5 rounded-lg border bg-background/50 p-1.5 ${expanded ? "max-h-128" : "max-h-64"} overflow-y-auto`}>
        {shown.filter((m) => m.text || m.tool_call || m.tool_result || m.thinking).map((m, i) => (
          <TranscriptMessageLine key={i} m={m} expanded={expanded} />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-xs text-oobo-cyan hover:text-oobo-cyan/80 transition-colors"
        >
          {expanded ? "Show less" : `Show all ${messages.length} messages`}
        </button>
      )}
    </div>
  );
}

export function AnchorDetail({ payload, hasTranscript, transcriptMessages }: AnchorDetailProps) {
  const anchor = payload.anchor;
  if (!anchor) return null;

  const allSessions = anchor.sessions ?? [];
  const rootSessions = allSessions.filter((s) => !s.is_subagent);
  const subagentSessions = allSessions.filter((s) => s.is_subagent);

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      {/* Contributors */}
      {anchor.contributors && anchor.contributors.length > 0 && (
        <div>
          <h4 className="text-sm font-heading font-semibold mb-2">Contributors</h4>
          <div className="flex flex-wrap gap-2">
            {anchor.contributors.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-md bg-background border px-2.5 py-1.5 text-sm">
                <span>{c.name}</span>
                <AuthorTypeBadge type={c.role === "agent" ? "agent" : "human"} />
                {c.model && <span className="text-xs text-muted-foreground">({c.model})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Changes */}
      {anchor.file_changes && anchor.file_changes.length > 0 && (
        <div>
          <h4 className="text-sm font-heading font-semibold mb-2">File Changes</h4>
          <div className="space-y-1">
            {anchor.file_changes.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm font-mono py-1">
                <span className="flex-1 truncate">{f.path}</span>
                <span className="text-oobo-green text-xs">+{f.added}</span>
                <span className="text-oobo-red text-xs">-{f.deleted}</span>
                <AttributionBadge attribution={f.attribution} />
                {f.agent && <span className="text-xs text-muted-foreground">{f.agent}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Interactions (multi-session file sharing) */}
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

      {/* Sessions */}
      {anchor.sessions && anchor.sessions.length > 0 && (
        <div>
          <h4 className="text-sm font-heading font-semibold mb-2">Sessions</h4>
          <div className="space-y-2">
            {rootSessions.map((s, i) => (
              <SessionCard key={i} session={s} allSubagents={subagentSessions} depth={0} />
            ))}
            {/* Orphaned subagents (parent not in this commit) */}
            {subagentSessions
              .filter((sub) => !allSessions.some((r) => r.session_id === sub.parent_session_id))
              .map((s, i) => (
                <SessionCard key={`orphan-${i}`} session={s} allSubagents={subagentSessions} depth={0} />
              ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      {/* TODO: Add per-session transcript view using payload.session_transcripts when available */}
      {hasTranscript && transcriptMessages && transcriptMessages.length > 0 && (
        <TranscriptSection messages={transcriptMessages} />
      )}
    </div>
  );
}

type SessionEntry = NonNullable<NonNullable<AnchorPayload["anchor"]>["sessions"]>[number];

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
          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
            ↳ {s.subagent_type ?? "subagent"}
          </Badge>
        )}
        {s.subagent_count != null && s.subagent_count > 0 && (
          <span className="text-xs text-muted-foreground">{s.subagent_count} subagent{s.subagent_count > 1 ? "s" : ""}</span>
        )}
        {s.peer_session_ids && s.peer_session_ids.length > 0 && (
          <span className="text-xs text-muted-foreground">{s.peer_session_ids.length} peer{s.peer_session_ids.length > 1 ? "s" : ""}</span>
        )}

        <div className="ml-auto flex flex-wrap gap-3 text-xs text-muted-foreground">
          {s.input_tokens != null && <span>{s.input_tokens.toLocaleString()} in</span>}
          {s.output_tokens != null && <span>{s.output_tokens.toLocaleString()} out</span>}
          {s.duration_secs != null && <span>{s.duration_secs}s</span>}
          {s.tool_calls != null && <span>{s.tool_calls} calls</span>}
          {s.thinking_duration_ms != null && <span>{formatDuration(s.thinking_duration_ms)} thinking</span>}
        </div>

        {s.tool_usage && Object.keys(s.tool_usage).length > 0 && (
          <div className="w-full text-xs text-muted-foreground pt-1 border-t border-border/50 mt-1">
            {formatToolUsage(s.tool_usage)}
          </div>
        )}
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
