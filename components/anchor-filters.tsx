"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Search } from "lucide-react";

const AUTHOR_TYPES = ["all", "agent", "assisted", "human", "automated"] as const;

interface AnchorFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  authorType: string;
  onAuthorTypeChange: (value: string) => void;
  branch: string;
  onBranchChange: (value: string) => void;
  branches: string[];
}

export function AnchorFilters({
  search,
  onSearchChange,
  authorType,
  onAuthorTypeChange,
  branch,
  onBranchChange,
  branches,
}: AnchorFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search commits, authors, branches..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex rounded-md border border-input overflow-hidden">
          {AUTHOR_TYPES.map((t) => (
            <Button
              key={t}
              variant={authorType === t ? "default" : "ghost"}
              size="sm"
              onClick={() => onAuthorTypeChange(t)}
              className="rounded-none border-0 capitalize"
            >
              {t}
            </Button>
          ))}
        </div>

        {branches.length > 0 && (
          <Select value={branch} onChange={(e) => onBranchChange(e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        )}
      </div>
    </div>
  );
}
