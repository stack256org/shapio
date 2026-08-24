import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageBody } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { ADMIN_ROLE } from "@/config/platform";
import {
  getPlatformStats,
  getRecentUsers,
  getRecentWorkspaces,
} from "@/lib/orbit/stats";

export const metadata = {
  title: "Platform Admin",
};

export default async function OrbitPage() {
  const [stats, recentWorkspaces, recentUsers] = await Promise.all([
    getPlatformStats(),
    getRecentWorkspaces(5),
    getRecentUsers(5),
  ]);

  return (
    <div className="flex flex-col">
      <SetPageHeader
        description="Platform-wide health, activity, and operator controls."
        portalHref={null}
        title="Platform Overview"
      />

      <PageBody>
        {/* Stat grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard
            label="Workspaces"
            sub={`+${stats.newWorkspacesThisMonth} this month`}
            value={stats.totalWorkspaces}
          />
          <StatCard
            label="Users"
            sub={`+${stats.newUsersThisMonth} this month`}
            value={stats.totalUsers}
          />
          <StatCard label="Posts" value={stats.totalPosts} />
          <StatCard label="Votes" value={stats.totalVotes} />
          <StatCard label="Comments" value={stats.totalComments} />
          <StatCard
            alert={stats.suspendedWorkspaces > 0}
            label="Suspended"
            value={stats.suspendedWorkspaces}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* Recent Workspaces */}
          <div className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
            <div className="flex items-center justify-between border-b border-ir-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ir-heading">
                Recent Workspaces
              </h2>
              <Link
                className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading"
                href="/orbit/workspaces"
              >
                View all
                <CaretRightIcon className="size-2.5" />
              </Link>
            </div>
            <div className="divide-y divide-ir-border">
              {recentWorkspaces.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ir-muted">
                  No workspaces yet.
                </p>
              ) : (
                recentWorkspaces.map((ws) => (
                  <Link
                    className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface"
                    href={`/orbit/workspaces/${ws.id}`}
                    key={ws.id}
                  >
                    <div className="grid size-7 shrink-0 place-items-center rounded-ir-sm bg-ir-muted-surface text-xs font-bold text-ir-muted">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ir-heading">
                        {ws.name}
                      </p>
                      <p className="truncate text-xs text-ir-muted">
                        /{ws.slug}
                      </p>
                    </div>
                    {ws.isSuspended && (
                      <Badge className="shrink-0" variant="destructive">
                        Suspended
                      </Badge>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
            <div className="flex items-center justify-between border-b border-ir-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ir-heading">
                Recent Users
              </h2>
              <Link
                className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading"
                href="/orbit/users"
              >
                View all
                <CaretRightIcon className="size-2.5" />
              </Link>
            </div>
            <div className="divide-y divide-ir-border">
              {recentUsers.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ir-muted">
                  No users yet.
                </p>
              ) : (
                recentUsers.map((u) => (
                  <Link
                    className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface"
                    href={`/orbit/users/${u.id}`}
                    key={u.id}
                  >
                    <div className="grid size-7 shrink-0 place-items-center rounded-ir-sm bg-ir-muted-surface text-xs font-bold text-ir-muted">
                      {u.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ir-heading">
                        {u.email}
                      </p>
                      {u.name && (
                        <p className="truncate text-xs text-ir-muted">
                          {u.name}
                        </p>
                      )}
                    </div>
                    {u.role === ADMIN_ROLE && (
                      <span className="shrink-0 text-2xs font-semibold uppercase tracking-eyebrow text-ir-success">
                        Admin
                      </span>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </PageBody>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: number;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-ir-card border bg-ir-surface p-5 shadow-ir-xs ${alert && value > 0 ? "border-ir-danger/30" : "border-ir-border"}`}
    >
      <p className="text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold tracking-normal text-ir-heading ${alert && value > 0 ? "text-ir-danger" : ""}`}
      >
        {value.toLocaleString()}
      </p>
      {sub && <p className="mt-1 text-xs text-ir-muted">{sub}</p>}
    </div>
  );
}
