import { cn } from "@/lib/utils";

interface AiPercentageBarProps {
  percentage: number | null | undefined;
  showLabel?: boolean;
  className?: string;
}

export function AiPercentageBar({ percentage, showLabel = true, className }: AiPercentageBarProps) {
  const aiPct = percentage != null ? Math.min(100, Math.max(0, percentage)) : null;

  if (aiPct == null) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-2 flex-1 rounded-full bg-muted" />
        {showLabel && <span className="text-xs text-muted-foreground">—</span>}
      </div>
    );
  }

  const humanPct = 100 - aiPct;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden flex">
        {aiPct > 0 && (
          <div
            className="h-full bg-oobo-cyan transition-all duration-300"
            style={{ width: `${aiPct}%` }}
            title={`AI: ${aiPct.toFixed(1)}%`}
          />
        )}
        {humanPct > 0 && (
          <div
            className="h-full bg-oobo-teal transition-all duration-300"
            style={{ width: `${humanPct}%` }}
            title={`Human: ${humanPct.toFixed(1)}%`}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {aiPct.toFixed(0)}% AI
        </span>
      )}
    </div>
  );
}
