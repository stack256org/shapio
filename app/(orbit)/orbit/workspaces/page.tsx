import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageBody } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { listOrbitWorkspaces } from "@/lib/orbit/workspaces";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Workspaces" };

interface Props {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
] as const;

export default async function OrbitWorkspacesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const search = params.search?.trim() || undefined;
  const status =
    params.status === "active" || params.status === "suspended"
      ? params.status
      : undefined;

  const { workspaces, total } = await listOrbitWorkspaces({
    page,
    search,
    status,
  });
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const buildUrl = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    if (search) {
      next.set("search", search);
    }
    if (status) {
      next.set("status", status);
    }
    next.set("page", String(page));
    for (const [k, v] of Object.entries(updates)) {
      if (v) {
        next.set(k, v);
      } else {
        next.delete(k);
      }
    }
    return `/orbit/workspaces?${next.toString()}`;
  };

  return (
    <div className="flex flex-col">
      <SetPageHeader
        description="Inspect, suspend, or delete any workspace on the platform."
        portalHref={null}
        title="Workspaces"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-ir-border px-4 py-3 sm:px-8">
        <form
          action="/orbit/workspaces"
          className="flex flex-wrap gap-2"
          method="GET"
        >
          {status && <input name="status" type="hidden" value={status} />}
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ir-muted" />
            <input
              className="h-9 w-64 rounded-ir-input border border-ir-border bg-ir-surface pl-8 pr-3 text-sm text-ir-heading placeholder:text-ir-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
              defaultValue={search}
              name="search"
              placeholder="Search name, slug, or owner…"
            />
          </div>
          <Button size="sm" type="submit" variant="outline">
            Search
          </Button>
          {search && (
            <Button asChild size="sm" variant="ghost">
              <Link href={buildUrl({ search: undefined, page: "1" })}>
                Clear
              </Link>
            </Button>
          )}
        </form>

        <div className="flex gap-1.5">
          {STATUS_FILTERS.map(({ label, value }) => (
            <Button
              asChild
              key={value || "all"}
              size="sm"
              variant={(status ?? "") === value ? "default" : "outline"}
            >
              <Link href={buildUrl({ status: value || undefined, page: "1" })}>
                {label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <PageBody>
        <div className="overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          {workspaces.length === 0 ? (
            <EmptyState
              message={
                search || status
                  ? "Try adjusting your search or filters."
                  : "Workspaces will appear here as they're created."
              }
              title="No workspaces found"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ir-border">
                    <th className="px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted">
                      Name
                    </th>
                    <th className="hidden px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted sm:table-cell">
                      Slug
                    </th>
                    <th className="hidden px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted md:table-cell">
                      Owner
                    </th>
                    <th className="px-4 py-2.5 text-right text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted">
                      Posts
                    </th>
                    <th className="hidden px-4 py-2.5 text-right text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted sm:table-cell">
                      Members
                    </th>
                    <th className="hidden px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted lg:table-cell">
                      Created
                    </th>
                    <th className="px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ir-border">
                  {workspaces.map((ws) => (
                    <tr
                      className="transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface"
                      key={ws.id}
                    >
                      <td className="max-w-0 px-4 py-3">
                        <Link
                          className="block truncate font-semibold text-ir-heading hover:underline"
                          href={`/orbit/workspaces/${ws.id}`}
                        >
                          {ws.name}
                        </Link>
                      </td>
                      <td className="hidden max-w-0 px-4 py-3 font-mono text-xs text-ir-muted sm:table-cell">
                        <span className="block truncate">/{ws.slug}</span>
                      </td>
                      <td className="hidden max-w-0 px-4 py-3 text-xs text-ir-muted md:table-cell">
                        <span className="block truncate">
                          {ws.ownerEmail ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-ir-body">
                        {ws.postCount}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono text-sm text-ir-body sm:table-cell">
                        {ws.memberCount}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-ir-muted lg:table-cell">
                        {formatDateTime(ws.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={ws.isSuspended ? "destructive" : "default"}
                        >
                          {ws.isSuspended ? "Suspended" : "Active"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ir-border px-4 py-3">
              <span className="text-xs text-ir-muted">
                Page {page} of {totalPages} · {total} workspaces
              </span>
              <div className="flex flex-wrap gap-2">
                {page > 1 && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={buildUrl({ page: String(page - 1) })}>
                      ← Previous
                    </Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={buildUrl({ page: String(page + 1) })}>
                      Next →
                    </Link>
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

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-ir-full bg-ir-muted-surface text-ir-muted">
        <MagnifyingGlassIcon className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-ir-heading">{title}</p>
        <p className="mt-1 text-xs text-ir-muted">{message}</p>
      </div>
    </div>
  );
}
