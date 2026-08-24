import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageBody } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { listOrbitUsers } from "@/lib/orbit/users";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Users" };

interface Props {
  searchParams: Promise<{
    page?: string;
    search?: string;
    filter?: string;
  }>;
}

const ROLE_FILTERS = [
  { label: "All", value: "" },
  { label: "Admins", value: "admins" },
] as const;

export default async function OrbitUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const search = params.search?.trim() || undefined;
  const adminsOnly = params.filter === "admins";

  const { users, total } = await listOrbitUsers({ page, search, adminsOnly });
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const buildUrl = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    if (search) {
      next.set("search", search);
    }
    if (adminsOnly) {
      next.set("filter", "admins");
    }
    next.set("page", String(page));
    for (const [k, v] of Object.entries(updates)) {
      if (v) {
        next.set(k, v);
      } else {
        next.delete(k);
      }
    }
    return `/orbit/users?${next.toString()}`;
  };

  return (
    <div className="flex flex-col">
      <SetPageHeader
        description="Inspect, manage roles, and impersonate any user on the platform."
        portalHref={null}
        title="Users"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-ir-border px-4 py-3 sm:px-8">
        <form
          action="/orbit/users"
          className="flex flex-wrap gap-2"
          method="GET"
        >
          {adminsOnly && <input name="filter" type="hidden" value="admins" />}
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ir-muted" />
            <input
              className="h-9 w-64 rounded-ir-input border border-ir-border bg-ir-surface pl-8 pr-3 text-sm text-ir-heading placeholder:text-ir-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
              defaultValue={search}
              name="search"
              placeholder="Search name or email…"
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
          {ROLE_FILTERS.map(({ label, value }) => (
            <Button
              asChild
              key={label}
              size="sm"
              variant={
                (adminsOnly ? "admins" : "") === value ? "default" : "outline"
              }
            >
              <Link href={buildUrl({ filter: value || undefined, page: "1" })}>
                {label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <PageBody>
        <div className="overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          {users.length === 0 ? (
            <EmptyState
              message={
                search || adminsOnly
                  ? "Try adjusting your search or filters."
                  : "Users will appear here as they sign up."
              }
              title="No users found"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[12%]" />
                  <col className="hidden w-[12%] sm:table-column" />
                  <col className="hidden w-[14%] md:table-column" />
                  <col className="hidden w-[18%] lg:table-column" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-ir-border">
                    <th className="px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted">
                      User
                    </th>
                    <th className="px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted">
                      Role
                    </th>
                    <th className="hidden px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted sm:table-cell">
                      Status
                    </th>
                    <th className="hidden px-4 py-2.5 text-right text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted md:table-cell">
                      Workspaces
                    </th>
                    <th className="hidden px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted lg:table-cell">
                      Joined
                    </th>
                    <th className="px-4 py-2.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ir-border">
                  {users.map((u) => (
                    <tr
                      className="transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface"
                      key={u.id}
                    >
                      <td className="overflow-hidden px-4 py-3">
                        <div className="truncate font-semibold text-ir-heading">
                          {u.email}
                        </div>
                        {u.name && (
                          <div className="truncate text-xs text-ir-muted">
                            {u.name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.isAdmin ? "default" : "secondary"}>
                          {u.isAdmin ? "Admin" : "User"}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <Badge variant={u.banned ? "destructive" : "default"}>
                          {u.banned ? "Banned" : "Active"}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono text-sm text-ir-body md:table-cell">
                        {u.workspaceCount}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-ir-muted lg:table-cell">
                        {formatDateTime(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          className="text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading"
                          href={`/orbit/users/${u.id}`}
                        >
                          View →
                        </Link>
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
                Page {page} of {totalPages} · {total} users
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
