"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChangelogStatusFilterProps {
  activeStatus: "all" | "draft" | "published";
}

// Same all/published/drafts-only pattern as the Feedback page's Draft filter,
// URL-param driven so the server re-renders with the right entries visible.
export function ChangelogStatusFilter({
  activeStatus,
}: ChangelogStatusFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateStatus = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete("status");
      } else {
        params.set("status", value);
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <Select onValueChange={updateStatus} value={activeStatus}>
      <SelectTrigger size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All &amp; drafts</SelectItem>
        <SelectItem value="published">Published</SelectItem>
        <SelectItem value="draft">Drafts</SelectItem>
      </SelectContent>
    </Select>
  );
}
