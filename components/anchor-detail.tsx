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
      duration_secs?: number;
      tool_calls?: number;
      link_type?: string;
    }>;
  };
  transcript?: Array<{ role: string; text: string }>;
}

interface AnchorDetailProps {
  payload: AnchorPayload;
  hasTranscript: boolean;
  transcriptMessages?: Array<{ role: string; text: string }>;
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

export function AnchorDetail({ payload, hasTranscript, transcriptMessages }: AnchorDetailProps) {
  const anchor = payload.anchor;
  if (!anchor) return null;

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
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

      {anchor.sessions && anchor.sessions.length > 0 && (
        <div>
          <h4 className="text-sm font-heading font-semibold mb-2">Sessions</h4>
          <div className="space-y-2">
            {anchor.sessions.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded-md bg-background border px-3 py-2 text-sm">
                <code className="text-xs text-muted-foreground">{s.session_id.slice(0, 8)}</code>
                <span className="font-medium">{s.agent}</span>
                {s.model && <span className="text-xs text-muted-foreground">{s.model}</span>}
                {s.link_type && (
                  <Badge variant="outline" className="text-xs">{s.link_type}</Badge>
                )}
                <div className="ml-auto flex gap-3 text-xs text-muted-foreground">
                  {s.input_tokens != null && <span>{s.input_tokens.toLocaleString()} in</span>}
                  {s.output_tokens != null && <span>{s.output_tokens.toLocaleString()} out</span>}
                  {s.duration_secs != null && <span>{s.duration_secs}s</span>}
                  {s.tool_calls != null && <span>{s.tool_calls} calls</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasTranscript && transcriptMessages && transcriptMessages.length > 0 && (
        <div>
          <h4 className="text-sm font-heading font-semibold mb-2">Transcript Preview</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {transcriptMessages.slice(0, 6).map((m, i) => (
              <div key={i} className="text-sm">
                <span className={`font-medium ${m.role === "assistant" ? "text-oobo-cyan" : "text-oobo-teal"}`}>
                  {m.role}:
                </span>{" "}
                <span className="text-muted-foreground">{m.text.slice(0, 200)}{m.text.length > 200 ? "..." : ""}</span>
              </div>
            ))}
            {transcriptMessages.length > 6 && (
              <p className="text-xs text-muted-foreground">+{transcriptMessages.length - 6} more messages</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
