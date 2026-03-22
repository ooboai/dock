"use client";

import { Badge } from "@/components/ui/badge";
import { AuthorTypeBadge } from "@/components/author-type-badge";

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
  const labels: Record<string, string> = {
    writer: "write",
    reader: "read",
    both: "read+write",
  };
  return (
    <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
      {labels[role] ?? role}
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

export function AnchorDetail({ payload, committedAt }: AnchorDetailProps) {
  const anchor = payload.anchor;
  if (!anchor) return null;

  const allSessions = anchor.sessions ?? [];
  const rootSessions = allSessions.filter((s) => !s.is_subagent);
  const subagentSessions = allSessions.filter((s) => s.is_subagent);

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      {/* Full date */}
      {committedAt && (
        <p className="text-xs text-muted-foreground/60">{formatFullDate(committedAt)}</p>
      )}

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
                <span className="text-destructive text-xs">-{f.deleted}</span>
                <AttributionBadge attribution={f.attribution} />
                {f.agent && <span className="text-xs text-muted-foreground">{f.agent}</span>}
              </div>
            ))}
          </div>
        </div>
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

      {/* Sessions */}
      {anchor.sessions && anchor.sessions.length > 0 && (
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
          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
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
