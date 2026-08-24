import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { and, count, desc, eq, ilike, isNull, or } from "drizzle-orm";
import Link from "next/link";
import { AuditTypeSelect } from "@/components/admin/audit-type-select";
import { Button } from "@/components/ui/button";
import { PageBody } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { auditLogs } from "@/db/schema";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Audit Log" };

interface Props {
  searchParams: Promise<{ page?: string; q?: string; type?: string }>;
}

const ENTITY_TYPES = [
  "user",
  "workspace",
  "platform",
  "post",
  "comment",
  "member",
  "invite",
  "webhook",
  "api_key",
  "feature_flag",
  "profile",
];

function actionBadgeClass(action: string): string {
  if (/delete|ban|suspend|revoke|remove|left/.test(action)) {
    return "bg-ir-danger/10 text-ir-danger";
  }
  if (/creat|join|unsuspend|unban|invited|added|grant/.test(action)) {
    return "bg-ir-success/10 text-ir-success";
  }
  if (/impersonat|auth\.|user\.created/.test(action)) {
    return "bg-ir-warning/10 text-ir-warning";
  }
  return "bg-ir-muted-surface text-ir-muted";
}

function buildUrl(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && String(v) !== "1") {
      sp.set(k, String(v));
    }
  }
  const qs = sp.toString();
  return `/orbit/audit-log${qs ? `?${qs}` : ""}`;
}

export default async function OrbitAuditLogPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q?.trim() ?? "";
  const type = params.type ?? "";
  const limit = 50;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [
    isNull(auditLogs.workspaceId) as ReturnType<typeof eq>,
  ];

  if (q) {
    const searchClause = or(
      ilike(auditLogs.actorEmail, `%${q}%`),
      ilike(auditLogs.actorName, `%${q}%`),
      ilike(auditLogs.entityName, `%${q}%`),
      ilike(auditLogs.description, `%${q}%`),
      ilike(auditLogs.action, `%${q}%`)
    );
    if (searchClause) {
      conditions.push(searchClause as ReturnType<typeof eq>);
    }
  }

  if (type) {
    conditions.push(eq(auditLogs.entityType, type) as ReturnType<typeof eq>);
  }

  const where = and(...conditions);

  const [logs, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(auditLogs).where(where),
  ]);

  const totalCount = Number(total);
  const hasMore = offset + logs.length < totalCount;
  const from = totalCount === 0 ? 0 : offset + 1;
  const to = Math.min(offset + logs.length, totalCount);

  const prevUrl =
    page > 1
      ? buildUrl({ page: page - 1, q: q || undefined, type: type || undefined })
      : null;
  const nextUrl = hasMore
    ? buildUrl({ page: page + 1, q: q || undefined, type: type || undefined })
    : null;

  const hasFilters = q || type;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SetPageHeader
        description="Platform-level admin actions workspace suspension, role changes, impersonation, and auth events."
        portalHref={null}
        title="Platform Audit Log"
      />

      {/* Filter bar */}
      <form
        action="/orbit/audit-log"
        className="flex shrink-0 flex-wrap items-center gap-2 border-b border-ir-border px-4 py-3 sm:px-8"
        method="get"
      >
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ir-muted" />
          <input
            className="h-9 w-64 rounded-ir-input border border-ir-border bg-ir-surface pl-8 pr-3 text-sm text-ir-heading placeholder:text-ir-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            defaultValue={q}
            name="q"
            placeholder="Search events, actors, entities…"
            type="search"
          />
        </div>

        <AuditTypeSelect
          defaultValue={type}
          name="type"
          options={ENTITY_TYPES.map((t) => ({
            label: t.charAt(0).toUpperCase() + t.slice(1).replace("_", " "),
            value: t,
          }))}
        />

        <Button size="sm" type="submit" variant="outline">
          Filter
        </Button>

        {hasFilters && (
          <Button asChild size="sm" variant="ghost">
            <Link href="/orbit/audit-log">Clear</Link>
          </Button>
        )}

        <span className="ml-auto text-xs text-ir-muted">
          {totalCount.toLocaleString()} event{totalCount === 1 ? "" : "s"}
        </span>
      </form>

      <PageBody className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          {logs.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
              <div className="flex size-10 items-center justify-center rounded-ir-full bg-ir-muted-surface text-ir-muted">
                <MagnifyingGlassIcon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-ir-heading">
                  {hasFilters ? "No matching events" : "No audit events yet"}
                </p>
                <p className="mt-1 text-xs text-ir-muted">
                  {hasFilters
                    ? "Try adjusting your search or filters."
                    : "Platform-level admin actions will appear here."}
                </p>
              </div>
              {hasFilters && (
                <Link
                  className="text-xs font-semibold text-ir-muted underline-offset-2 hover:text-ir-heading hover:underline"
                  href="/orbit/audit-log"
                >
                  Clear filters
                </Link>
              )}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-ir-border bg-ir-muted-surface/60 backdrop-blur-sm">
                  <tr>
                    <th className="h-10 whitespace-nowrap px-4 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted">
                      Event
                    </th>
                    <th className="h-10 whitespace-nowrap px-4 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted">
                      Actor
                    </th>
                    <th className="h-10 whitespace-nowrap px-4 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted">
                      Entity
                    </th>
                    <th className="h-10 px-4 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted">
                      Description
                    </th>
                    <th className="h-10 whitespace-nowrap px-4 text-right text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted">
                      When
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ir-border">
                  {logs.map((log) => (
                    <tr
                      className="transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface"
                      key={log.id}
                    >
                      {/* Action */}
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex max-w-40 items-center truncate rounded-ir-sm px-1.5 py-0.5 font-mono text-2xs font-semibold uppercase tracking-eyebrow ${actionBadgeClass(log.action)}`}
                            title={log.action}
                          >
                            {log.action}
                          </span>
                          <span className="text-2xs uppercase tracking-eyebrow text-ir-muted">
                            {log.entityType}
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="max-w-40 px-4 py-3 align-top">
                        <span
                          className="block truncate text-xs text-ir-body"
                          title={log.actorEmail ?? log.actorId ?? undefined}
                        >
                          {log.actorName
                            ? log.actorName
                            : (log.actorEmail ??
                              log.actorId ?? (
                                <span className="italic">System</span>
                              ))}
                        </span>
                        {log.actorName && log.actorEmail && (
                          <span
                            className="block truncate text-2xs text-ir-muted"
                            title={log.actorEmail}
                          >
                            {log.actorEmail}
                          </span>
                        )}
                      </td>

                      {/* Entity */}
                      <td className="max-w-40 px-4 py-3 align-top">
                        {log.entityName ? (
                          <span
                            className="block truncate text-xs text-ir-heading"
                            title={log.entityName}
                          >
                            {log.entityName}
                          </span>
                        ) : log.entityId ? (
                          <span
                            className="block truncate font-mono text-2xs text-ir-muted"
                            title={log.entityId}
                          >
                            {log.entityId.slice(0, 12)}…
                          </span>
                        ) : (
                          <span className="text-xs text-ir-muted/40">—</span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="min-w-50 px-4 py-3 align-top">
                        <p className="line-clamp-2 text-xs text-ir-body">
                          {log.description}
                        </p>
                      </td>

                      {/* When */}
                      <td className="px-4 py-3 text-right align-top">
                        <time
                          className="whitespace-nowrap text-xs text-ir-muted"
                          dateTime={log.createdAt.toISOString()}
                          title={log.createdAt.toISOString()}
                        >
                          {formatDateTime(log.createdAt)}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {(prevUrl || nextUrl || totalCount > 0) && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-ir-border px-4 py-3">
              <span className="text-xs text-ir-muted">
                {totalCount === 0
                  ? "No events"
                  : `${from.toLocaleString()}–${to.toLocaleString()} of ${totalCount.toLocaleString()} events`}
              </span>
              <div className="flex flex-wrap gap-2">
                {prevUrl && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={prevUrl}>← Previous</Link>
                  </Button>
                )}
                {nextUrl && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={nextUrl}>Next →</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </PageBody>
    </div>
  );
}
