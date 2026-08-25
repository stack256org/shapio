"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CHANGELOG_LABEL_VALUES,
  CHANGELOG_LABELS,
} from "@/lib/changelog/constants";

interface ChangelogFiltersProps {
  activeLabel: string;
  activeSearch: string;
}

export function ChangelogFilters({
  activeLabel,
  activeSearch,
}: ChangelogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <SearchInput
        className="h-9 min-w-50 flex-1"
        defaultValue={activeSearch}
        onSearch={(value) => updateParam({ q: value || null })}
        placeholder="Search"
      />

      <Select
        onValueChange={(v) => updateParam({ label: v === "all" ? null : v })}
        value={activeLabel || "all"}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tags</SelectItem>
          {CHANGELOG_LABEL_VALUES.map((value) => (
            <SelectItem key={value} value={value}>
              {CHANGELOG_LABELS[value].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
