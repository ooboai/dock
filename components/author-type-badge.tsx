import { cn } from "@/lib/utils";

const AUTHOR_TYPE_STYLES: Record<string, string> = {
  agent: "bg-foreground text-background",
  assisted: "bg-foreground/80 text-background",
  human: "bg-muted-foreground/20 text-foreground",
  automated: "bg-muted text-muted-foreground",
};

interface AuthorTypeBadgeProps {
  type: string | null | undefined;
  className?: string;
}

export function AuthorTypeBadge({ type, className }: AuthorTypeBadgeProps) {
  const normalizedType = (type ?? "").toLowerCase();
  const style = AUTHOR_TYPE_STYLES[normalizedType] ?? "bg-muted text-muted-foreground";
  const label = type ?? "unknown";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
