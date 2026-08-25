"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { PostsPagination } from "@/components/posts/posts-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PostsPaginationBarProps {
  // Filter/sort/search params to preserve on every link — plain data, not a
  // href-building function: this is a Client Component, and functions from
  // the server page can't cross that boundary (they aren't serializable).
  // page/pageSize are added on top of this per-link, not included here.
  baseParams: Record<string, string>;
  currentPage: number;
  defaultPageSize: number;
  pageSize: number;
  totalPages: number;
}

// Preset options for the "Rows per page" select. The current page size is
// added as an extra option if it isn't one of these (e.g. a hand-edited URL)
// so the trigger always has a matching item to display.
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function PostsPaginationBar({
  baseParams,
  currentPage,
  defaultPageSize,
  pageSize,
  totalPages,
}: PostsPaginationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [goToPageInput, setGoToPageInput] = useState("");

  // Defensive: the server already clamps these to finite values, but this
  // guards the render regardless of how a bad value could arrive (a stale
  // client bundle mid-deploy, a future caller that skips validation) rather
  // than handing SelectItem a NaN `children` or baking "NaN" into a href.
  const safePageSize = Number.isFinite(pageSize) ? pageSize : defaultPageSize;
  const safeTotalPages = Number.isFinite(totalPages) ? totalPages : 1;
  const safeCurrentPage = Number.isFinite(currentPage) ? currentPage : 1;

  function buildHref(page: number, size: number) {
    const params = new URLSearchParams(baseParams);
    if (page > 1) {
      params.set("page", String(page));
    }
    if (size !== defaultPageSize) {
      params.set("pageSize", String(size));
    }
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  function hrefForPage(page: number) {
    return buildHref(page, safePageSize);
  }

  function handlePageSizeChange(value: string) {
    const size = Number(value);
    if (size !== safePageSize) {
      // Changing rows-per-page always resets to page 1 — the current page
      // number wouldn't mean the same thing under a different page size.
      router.push(buildHref(1, size));
    }
  }

  function commitGoToPage() {
    const trimmed = goToPageInput.trim();
    const parsed = Number(trimmed);
    setGoToPageInput("");
    if (trimmed === "" || !Number.isFinite(parsed)) {
      return;
    }
    const clamped = Math.min(safeTotalPages, Math.max(1, Math.round(parsed)));
    if (clamped !== safeCurrentPage) {
      router.push(hrefForPage(clamped));
    }
  }

  const pageSizeOptions = PAGE_SIZE_OPTIONS.includes(safePageSize)
    ? PAGE_SIZE_OPTIONS
    : [...PAGE_SIZE_OPTIONS, safePageSize].sort((a, b) => a - b);

  return (
    <div className="grid w-full grid-cols-1 items-center gap-3 sm:grid-cols-3">
      {/* Rows per page */}
      <div className="flex items-center gap-2">
        <label
          className="text-xs whitespace-nowrap text-ir-muted"
          htmlFor="posts-page-size"
        >
          Rows per page
        </label>
        <Select
          onValueChange={handlePageSizeChange}
          value={String(safePageSize)}
        >
          <SelectTrigger
            className="h-8 w-18 px-2 text-sm"
            id="posts-page-size"
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Go to page */}
      <div className="flex items-center justify-start gap-2 sm:justify-center">
        <label
          className="text-xs whitespace-nowrap text-ir-muted"
          htmlFor="posts-go-to-page"
        >
          Go to page
        </label>
        <Input
          className="h-8 w-20 px-2 text-sm"
          id="posts-go-to-page"
          inputMode="numeric"
          onChange={(e) => setGoToPageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitGoToPage();
            }
          }}
          placeholder={`1–${safeTotalPages}`}
          type="number"
          value={goToPageInput}
        />
        <Button
          onClick={commitGoToPage}
          size="sm"
          type="button"
          variant="outline"
        >
          Go
        </Button>
      </div>

      {/* Previous / page numbers / Next */}
      <PostsPagination
        className="justify-start sm:justify-end"
        currentPage={safeCurrentPage}
        hrefForPage={hrefForPage}
        totalPages={safeTotalPages}
      />
    </div>
  );
}
