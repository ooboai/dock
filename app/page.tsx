"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { StatsSummary } from "@/components/stats-summary";
import { AnchorFilters } from "@/components/anchor-filters";
import { AnchorList } from "@/components/anchor-list";
import { TranscriptPanel } from "@/components/transcript-panel";
import { Anchor as AnchorIcon } from "lucide-react";
import type { AnchorRow } from "@/components/anchor-list";

interface StatsData {
  count: number;
  added: number;
  deleted: number;
  aiAdded: number;
  aiDeleted: number;
  totalTokens: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function DashboardPage() {
  const [anchors, setAnchors] = useState<AnchorRow[]>([]);
  const [stats, setStats] = useState<StatsData>({
    count: 0,
    added: 0,
    deleted: 0,
    aiAdded: 0,
    aiDeleted: 0,
    totalTokens: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [branches, setBranches] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [authorType, setAuthorType] = useState("all");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [transcriptAnchor, setTranscriptAnchor] = useState<AnchorRow | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  const fetchAnchors = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (authorType !== "all") params.set("authorType", authorType);
    if (branch) params.set("branch", branch);

    try {
      const res = await fetch(`/api/anchors?${params}`);
      const data = await res.json();
      setAnchors(data.anchors);
      setStats(data.stats);
      setPagination(data.pagination);
      setBranches(data.branches);
    } catch (err) {
      console.error("Failed to fetch anchors:", err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, authorType, branch]);

  useEffect(() => {
    setLoading(true);
    fetchAnchors();
  }, [fetchAnchors]);

  useEffect(() => {
    const interval = setInterval(fetchAnchors, 5000);
    return () => clearInterval(interval);
  }, [fetchAnchors]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, authorType, branch]);

  const handleTranscriptToggle = useCallback((anchor: AnchorRow | null) => {
    setTranscriptAnchor(anchor);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <header className="border-b bg-card shrink-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-[#7DD3E8] to-oobo-teal">
                <AnchorIcon className="h-4 w-4 text-white" />
              </div>
              <h1 className="font-heading text-lg font-bold text-primary">dock</h1>
            </div>
            <a
              href="https://github.com/ooboai/oobo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              powered by{" "}
              <span className="font-semibold bg-linear-to-r from-[#7DD3E8] to-oobo-teal bg-clip-text text-transparent">
                oobo
              </span>
            </a>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Main content — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <StatsSummary stats={stats} />

            <AnchorFilters
              search={search}
              onSearchChange={setSearch}
              authorType={authorType}
              onAuthorTypeChange={setAuthorType}
              branch={branch}
              onBranchChange={setBranch}
              branches={branches}
            />

            <AnchorList
              anchors={anchors}
              pagination={pagination}
              onPageChange={setPage}
              loading={loading}
              transcriptAnchorId={transcriptAnchor?.id ?? null}
              onTranscriptToggle={handleTranscriptToggle}
            />
          </div>
        </div>

        {/* Transcript panel — flex sibling, shares space */}
        {transcriptAnchor?.transcript && (
          <TranscriptPanel
            messages={transcriptAnchor.transcript.messages}
            commitHash={transcriptAnchor.commitHash}
            commitMessage={transcriptAnchor.message}
            onClose={() => setTranscriptAnchor(null)}
          />
        )}
      </div>
    </div>
  );
}
