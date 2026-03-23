"use client";

import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AiPercentageBar } from "@/components/ai-percentage-bar";
import { AuthorTypeBadge } from "@/components/author-type-badge";
import { AnchorDetail } from "@/components/anchor-detail";
import type { TranscriptMessage } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";

export interface AnchorRow {
  id: string;
  commitHash: string;
  message: string | null;
  author: string | null;
  authorType: string | null;
  aiPercentage: number | null;
  branch: string | null;
  committedAt: string | null;
  payload: Record<string, unknown>;
  transcript: { messages: TranscriptMessage[] } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AnchorListProps {
  anchors: AnchorRow[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
  loading: boolean;
  transcriptAnchorId: string | null;
  onTranscriptToggle: (anchor: AnchorRow | null) => void;
}

export function AnchorList({
  anchors,
  pagination,
  onPageChange,
  loading,
  transcriptAnchorId,
  onTranscriptToggle,
}: AnchorListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (anchors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-heading font-medium text-muted-foreground">No anchors yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Make a commit with oobo to see it appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Commit</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-[140px]">Author</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[140px]">AI %</TableHead>
              <TableHead className="w-[100px]">Branch</TableHead>
              <TableHead className="w-[140px]">Date</TableHead>
              <TableHead className="w-[36px]" />
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {anchors.map((anchor) => (
              <React.Fragment key={anchor.id}>
                <TableRow
                  className={`cursor-pointer ${transcriptAnchorId === anchor.id ? "bg-accent/30" : ""}`}
                  onClick={() => setExpandedId(expandedId === anchor.id ? null : anchor.id)}
                >
                  <TableCell className="font-mono text-xs">{anchor.commitHash.slice(0, 7)}</TableCell>
                  <TableCell className="max-w-[300px] truncate font-medium">{anchor.message ?? "—"}</TableCell>
                  <TableCell className="text-sm truncate">{anchor.author?.split("<")[0]?.trim() ?? "—"}</TableCell>
                  <TableCell>
                    <AuthorTypeBadge type={anchor.authorType} />
                  </TableCell>
                  <TableCell>
                    <AiPercentageBar percentage={anchor.aiPercentage} />
                  </TableCell>
                  <TableCell>
                    <code className="text-xs rounded bg-muted px-1.5 py-0.5">{anchor.branch ?? "—"}</code>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {timeAgo(anchor.committedAt)}
                  </TableCell>
                  <TableCell>
                    {anchor.transcript ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTranscriptToggle(transcriptAnchorId === anchor.id ? null : anchor);
                        }}
                        className={`p-1 rounded transition-colors ${transcriptAnchorId === anchor.id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                        title="View transcript"
                      >
                        <MessageSquareText className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="block w-3.5" />
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === anchor.id ? "rotate-180" : ""}`}
                    />
                  </TableCell>
                </TableRow>
                {expandedId === anchor.id && (
                  <TableRow key={`${anchor.id}-detail`}>
                    <TableCell colSpan={9} className="p-0">
                      <AnchorDetail
                        payload={anchor.payload as Record<string, unknown>}
                        committedAt={anchor.committedAt}
                        branch={anchor.branch}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} anchors
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
