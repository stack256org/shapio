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

interface Category {
  color: string;
  id: string;
  isArchived: boolean;
  name: string;
}

interface RoadmapFiltersProps {
  activeCategoryId: string;
  activeSearch: string;
  activeSort: "votes" | "latest_status_change";
  categories: Category[];
}

const SORT_OPTIONS = [
  { label: "Most votes", value: "votes" },
  { label: "Latest status change", value: "latest_status_change" },
] as const;

export function RoadmapFilters({
  activeCategoryId,
  activeSearch,
  activeSort,
  categories,
}: RoadmapFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "votes") {
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

  const activeCategories = categories.filter((c) => !c.isArchived);

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-ir-border px-4 py-4 sm:px-8">
      {/* Search */}
      <SearchInput
        className="h-9 min-w-50 flex-1"
        defaultValue={activeSearch}
        onSearch={(value) => updateParam({ q: value || null })}
        placeholder="Search"
      />

      <div className="flex flex-wrap items-center gap-2.5">
        {activeCategories.length > 0 && (
          <Select
            onValueChange={(v) =>
              updateParam({ category: v === "all" ? null : v })
            }
            value={activeCategoryId || "all"}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              {activeCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          onValueChange={(v) => updateParam({ sort: v })}
          value={activeSort}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
