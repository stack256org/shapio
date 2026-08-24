"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { SearchInput } from "@/components/ui/search-input";

interface ListSearchProps {
  // Overrides the default block-level row wrapper — used when this is placed
  // inline elsewhere (e.g. a page header's actions) instead of its own row.
  className?: string;
  defaultValue: string;
  placeholder?: string;
}

// Debounced URL-backed search bar for admin/team list pages. Writes the `q`
// search param (preserving any other params) and lets the server re-query — the
// same pattern the public roadmap/changelog filters use.
export function ListSearch({
  defaultValue,
  placeholder = "Search",
  className,
}: ListSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const update = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className={className ?? "border-base-300 px-4 py-4 sm:px-8"}>
      <SearchInput
        aria-label={placeholder}
        className="h-9 w-full sm:w-auto sm:min-w-50 sm:max-w-md"
        defaultValue={defaultValue}
        onSearch={update}
        placeholder={placeholder}
      />
    </div>
  );
}
