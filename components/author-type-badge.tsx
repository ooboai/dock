import { cn } from "@/lib/utils";

const AUTHOR_TYPE_STYLES: Record<string, string> = {
  agent: "bg-oobo-cyan text-white",
  assisted: "bg-gradient-to-r from-[#0ea5e9] to-[#14b8a6] text-white",
  human: "bg-oobo-teal text-white",
  automated: "bg-oobo-muted text-white",
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
