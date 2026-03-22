"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AiPercentageBar } from "@/components/ai-percentage-bar";
import { Anchor, GitCommitHorizontal, Binary, FileCode2 } from "lucide-react";

interface StatsData {
  count: number;
  added: number;
  deleted: number;
  aiAdded: number;
  aiDeleted: number;
  totalTokens: number;
}

interface StatsSummaryProps {
  stats: StatsData;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function StatsSummary({ stats }: StatsSummaryProps) {
  const totalHumanAdded = stats.added - stats.aiAdded;
  const aiPct =
    stats.aiAdded + totalHumanAdded > 0
      ? (stats.aiAdded / (stats.aiAdded + totalHumanAdded)) * 100
      : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-foreground/5 p-2.5">
              <Anchor className="h-5 w-5 text-foreground/60" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Anchors</p>
              <p className="text-2xl font-heading font-bold">{formatNumber(stats.count)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-foreground/5 p-2.5">
              <GitCommitHorizontal className="h-5 w-5 text-foreground/60" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">AI vs Human Code</p>
              <AiPercentageBar percentage={aiPct} className="mt-1.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-foreground/5 p-2.5">
              <Binary className="h-5 w-5 text-foreground/60" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tokens</p>
              <p className="text-2xl font-heading font-bold">{formatNumber(stats.totalTokens)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-foreground/5 p-2.5">
              <FileCode2 className="h-5 w-5 text-foreground/60" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lines Changed</p>
              <p className="text-2xl font-heading font-bold">
                {formatNumber(stats.added + stats.deleted)}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="text-oobo-green">+{formatNumber(stats.added)}</span>
                {" / "}
                <span className="text-destructive">-{formatNumber(stats.deleted)}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
