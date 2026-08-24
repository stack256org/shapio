"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditLogRow } from "@/lib/audit/queries";

interface Props {
  filterAction?: string;
  filterActor?: string;
  filterEntityType?: string;
  hasMore: boolean;
  limit: number;
  logs: AuditLogRow[];
  page: number;
  total: number;
  workspaceSlug: string;
}

const ENTITY_TYPES = ["workspace", "post", "comment", "member", "changelog"];

function buildUrl(
  slug: string,
  params: Record<string, string | number | undefined>
) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== 1) {
      sp.set(k, String(v));
    }
  }
  const qs = sp.toString();
  return `/${slug}/settings/audit-log${qs ? `?${qs}` : ""}`;
}

export function AuditLogTable({
  logs,
  total,
  page,
  limit,
  hasMore,
  workspaceSlug,
  filterAction,
  filterActor,
  filterEntityType,
}: Props) {
  const fmt = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const prevUrl =
    page > 1
      ? buildUrl(workspaceSlug, {
          page: page - 1,
          action: filterAction,
          actor: filterActor,
          entityType: filterEntityType,
        })
      : null;

  const nextUrl = hasMore
    ? buildUrl(workspaceSlug, {
        page: page + 1,
        action: filterAction,
        actor: filterActor,
        entityType: filterEntityType,
      })
    : null;

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          onValueChange={(v) => {
            const val = v === "all" ? "" : v;
            window.location.href = buildUrl(workspaceSlug, {
              action: filterAction,
              actor: filterActor,
              entityType: val || undefined,
              page: 1,
            });
          }}
          value={filterEntityType || "all"}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <form
          action={`/${workspaceSlug}/settings/audit-log`}
          className="flex gap-2"
          method="get"
        >
          {filterAction && (
            <input name="action" type="hidden" value={filterAction} />
          )}
          {filterEntityType && (
            <input name="entityType" type="hidden" value={filterEntityType} />
          )}
          <input
            aria-label="Search audit log"
            className="h-9 rounded-ir-input border border-ir-border bg-ir-surface px-3 text-sm text-ir-heading placeholder:text-ir-muted focus-visible:ring-2 focus-visible:ring-ir-primary/20 focus-visible:outline-none"
            defaultValue={filterActor ?? ""}
            name="actor"
            placeholder="Search by actor, action, or entity…"
            type="search"
          />
        </form>

        {(filterAction || filterActor || filterEntityType) && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/${workspaceSlug}/settings/audit-log`}>
              Clear filters
            </Link>
          </Button>
        )}

        <span className="ml-auto flex h-9 items-center text-xs text-ir-muted">
          {total} event{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <div className="rounded-ir-card border border-dashed border-ir-border p-8 text-center">
          <p className="text-sm text-ir-muted">No audit log entries found.</p>
        </div>
      ) : (
        <div className="divide-y divide-ir-border overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          {logs.map((log) => (
            <div
              className="grid grid-cols-1 gap-1 p-4 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface sm:grid-cols-[1fr_auto] sm:gap-4"
              key={log.id}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-ir-xs bg-ir-muted-surface px-1.5 py-0.5 font-mono text-xs text-ir-heading">
                    {log.action}
                  </span>
                  {log.entityName && (
                    <span className="truncate text-sm text-ir-heading">
                      {log.entityName}
                    </span>
                  )}
                </div>
                {log.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-ir-muted">
                    {log.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-ir-muted">
                  {log.actorName ?? log.actorEmail ?? "System"}
                  {log.entityType && (
                    <span className="ml-2 opacity-60">· {log.entityType}</span>
                  )}
                </p>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="text-xs whitespace-nowrap text-ir-muted">
                  {fmt.format(new Date(log.createdAt))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(prevUrl || nextUrl) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-ir-muted">
            Page {page} · {Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            {prevUrl ? (
              <Button asChild size="sm" variant="outline">
                <Link href={prevUrl}>Previous</Link>
              </Button>
            ) : (
              <Button disabled size="sm" variant="outline">
                Previous
              </Button>
            )}
            {nextUrl ? (
              <Button asChild size="sm" variant="outline">
                <Link href={nextUrl}>Next</Link>
              </Button>
            ) : (
              <Button disabled size="sm" variant="outline">
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
