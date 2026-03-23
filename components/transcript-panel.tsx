"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  ChevronRight,
  ChevronDown,
  Terminal,
  CheckCircle2,
  XCircle,
  User,
  Bot,
  Copy,
  Check,
  Brain,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TranscriptMessage } from "@/lib/types";

// ─── Tool call / result pairing ─────────────────────────────────────────

function buildToolResultMap(messages: TranscriptMessage[]) {
  const map = new Map<string, TranscriptMessage["tool_result"]>();
  for (const m of messages) {
    if (m.tool_result?.tool_use_id) {
      map.set(m.tool_result.tool_use_id, m.tool_result);
    }
  }
  return map;
}

// ─── Message grouping ───────────────────────────────────────────────────

type ProcessedItem =
  | { kind: "text"; text: string }
  | { kind: "thinking"; text: string }
  | { kind: "tool_call"; toolCall: NonNullable<TranscriptMessage["tool_call"]>; result?: TranscriptMessage["tool_result"] };

interface MessageGroup {
  author: "user" | "assistant";
  items: ProcessedItem[];
}

function groupMessages(
  messages: TranscriptMessage[],
  resultMap: Map<string, TranscriptMessage["tool_result"]>
): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let current: MessageGroup | null = null;

  const push = (author: MessageGroup["author"], item: ProcessedItem) => {
    if (current?.author === author) {
      current.items.push(item);
    } else {
      current = { author, items: [item] };
      groups.push(current);
    }
  };

  for (const msg of messages) {
    if (msg.role === "tool") continue;
    if (!msg.text && !msg.thinking && !msg.tool_call) continue;

    if (msg.thinking) {
      push("assistant", { kind: "thinking", text: msg.thinking });
      continue;
    }
    if (msg.tool_call) {
      const result = resultMap.get(msg.tool_call.tool_use_id);
      push("assistant", { kind: "tool_call", toolCall: msg.tool_call, result: result ?? undefined });
      continue;
    }
    if (msg.text) {
      push(msg.role === "user" ? "user" : "assistant", { kind: "text", text: msg.text });
    }
  }
  return groups;
}

// ─── Renderers ──────────────────────────────────────────────────────────

function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const extractText = (node: React.ReactNode): string => {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (node && typeof node === "object" && "props" in node) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return extractText((node as any).props.children);
    }
    return "";
  };
  return (
    <div className="relative group my-2">
      <pre className="p-3 rounded-md bg-muted text-foreground text-xs font-mono overflow-x-auto leading-relaxed border">
        <code className={className}>{children}</code>
      </pre>
      <button
        onClick={async () => {
          try { await navigator.clipboard.writeText(extractText(children)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
        }}
        className="absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all bg-muted-foreground/20 hover:bg-muted-foreground/30 text-muted-foreground"
        title="Copy code"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

function ToolCallCard({
  toolCall,
  result,
}: {
  toolCall: NonNullable<TranscriptMessage["tool_call"]>;
  result?: TranscriptMessage["tool_result"];
}) {
  const [expanded, setExpanded] = useState(false);
  const success = result?.success ?? null;

  return (
    <div className="rounded-md border bg-card overflow-hidden text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <Terminal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground truncate">{toolCall.name || "Tool"}</span>
        {toolCall.input_summary && (
          <span className="text-muted-foreground truncate flex-1 text-left">{toolCall.input_summary}</span>
        )}
        <span className="shrink-0 ml-auto">
          {success === true && <CheckCircle2 className="h-3.5 w-3.5 text-oobo-green" />}
          {success === false && <XCircle className="h-3.5 w-3.5 text-destructive" />}
          {success === null && <span className="text-muted-foreground">...</span>}
        </span>
      </button>
      {expanded && (result?.output_summary || toolCall.input_summary) && (
        <div className="border-t px-3 py-2 bg-muted/30">
          {toolCall.input_summary && (
            <div className="text-muted-foreground mb-1">
              <span className="font-medium text-foreground/70">Input: </span>
              <span className="whitespace-pre-wrap wrap-break-word">{toolCall.input_summary}</span>
            </div>
          )}
          {result?.output_summary && (
            <div className={success === false ? "text-destructive" : "text-muted-foreground"}>
              <span className="font-medium text-foreground/70">Output: </span>
              <span className="whitespace-pre-wrap wrap-break-word">{result.output_summary}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ThinkingBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="pl-7">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/70 transition-colors"
      >
        <Brain className="h-3 w-3" />
        <span className="italic">Thinking…</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground italic whitespace-pre-wrap wrap-break-word bg-muted/30 rounded-md px-3 py-2 border">
          {text}
        </div>
      )}
    </div>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
  commitHash: string;
  commitMessage: string | null;
  onClose: () => void;
}

export function TranscriptPanel({ messages, commitHash, commitMessage, onClose }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const resultMap = useMemo(() => buildToolResultMap(messages), [messages]);
  const groups = useMemo(() => groupMessages(messages, resultMap), [messages, resultMap]);

  // Sticky author tracking
  const groupStartRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || groups.length === 0) return;
    const onScroll = () => {
      const threshold = 48;
      let best = 0;
      for (let i = 0; i < groupStartRefs.current.length; i++) {
        const el = groupStartRefs.current[i];
        if (!el) continue;
        const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
        if (top <= threshold) best = i;
      }
      setActiveGroupIndex(best);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, [groups.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [commitHash]);

  const activeGroup = groups[activeGroupIndex];
  const stickyIcon = activeGroup?.author === "user"
    ? <User className="h-3 w-3 text-muted-foreground" />
    : <Bot className="h-3 w-3 text-muted-foreground" />;
  const stickyLabel = activeGroup?.author === "user" ? "User" : "Assistant";

  return (
    <aside className="flex-1 shrink-0 border-l bg-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b flex items-center justify-between shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-heading font-semibold text-foreground truncate">{commitMessage || "Transcript"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {messages.length} msg{messages.length !== 1 ? "s" : ""}
            <span className="mx-1 opacity-40">·</span>
            <span className="font-mono">{commitHash.slice(0, 7)}</span>
          </p>
        </div>
        <button onClick={onClose} className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors ml-3">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Sticky author label */}
      {groups.length > 0 && activeGroup && (
        <div
          className="px-4 py-1.5 border-b flex items-center gap-2 shrink-0 bg-card z-10 cursor-pointer select-none"
          onClick={() => {
            const el = groupStartRefs.current[activeGroupIndex];
            if (!el || !scrollRef.current) return;
            const containerTop = scrollRef.current.getBoundingClientRect().top;
            const elTop = el.getBoundingClientRect().top;
            scrollRef.current.scrollBy({ top: elTop - containerTop - 8, behavior: "smooth" });
          }}
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-muted">
            {stickyIcon}
          </div>
          <span className="text-xs font-medium text-muted-foreground">{stickyLabel}</span>
        </div>
      )}

      {/* Message groups */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          {groups.map((group, gi) => {
            const isUser = group.author === "user";
            const icon = isUser
              ? <User className="h-3 w-3 text-muted-foreground" />
              : <Bot className="h-3 w-3 text-muted-foreground" />;
            const label = isUser ? "User" : "Assistant";

            return (
              <div key={gi}>
                <div ref={(el) => { groupStartRefs.current[gi] = el; }} />
                <div className={`flex items-center gap-2 py-2 ${gi > 0 ? "border-t" : ""}`}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-muted">
                    {icon}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
                <div className="space-y-2 pb-4">
                  {group.items.map((item, ii) => {
                    if (item.kind === "thinking") {
                      return <ThinkingBlock key={ii} text={item.text} />;
                    }
                    if (item.kind === "tool_call") {
                      return <ToolCallCard key={ii} toolCall={item.toolCall} result={item.result} />;
                    }
                    return (
                      <div
                        key={ii}
                        className={`text-sm leading-relaxed rounded px-3 py-2.5 ${
                          isUser ? "bg-muted/50 border" : "text-foreground/90"
                        }`}
                      >
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ href, children, ...props }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-foreground underline underline-offset-2 hover:text-foreground" {...props}>{children}</a>
                              ),
                              pre: ({ children }) => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const codeChild = React.Children.toArray(children).find(
                                  (child) => (child as any)?.type === "code" || (child as any)?.props?.className?.includes("language-")
                                ) as any;
                                return <CodeBlock className={codeChild?.props?.className}>{codeChild?.props?.children ?? children}</CodeBlock>;
                              },
                              code: ({ className, children }) => {
                                if (className?.includes("language-")) {
                                  return <code className={className}>{children}</code>;
                                }
                                return <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-muted text-foreground/80">{children}</code>;
                              },
                            }}
                          >
                            {item.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No transcript messages</p>
          )}
        </div>
      </div>
    </aside>
  );
}
