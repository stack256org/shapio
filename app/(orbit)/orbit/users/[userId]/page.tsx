import Link from "next/link";
import { notFound } from "next/navigation";
import { UserAdminActions } from "@/components/orbit/user-admin-actions";
import { Badge } from "@/components/ui/badge";
import { PageBody } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { requireAdmin } from "@/lib/authz";
import { env } from "@/lib/env";
import { getOrbitUser } from "@/lib/orbit/users";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "User Detail" };

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function OrbitUserDetailPage({ params }: Props) {
  const { userId } = await params;
  const [u, session] = await Promise.all([
    getOrbitUser(userId),
    requireAdmin(),
  ]);

  if (!u) {
    notFound();
  }

  const isCurrentUser = session.user.id === userId;
  const impersonationEnabled = env.ENABLE_IMPERSONATION;

  return (
    <div className="flex min-w-0 flex-col">
      <SetPageHeader
        actions={
          <UserAdminActions
            impersonationEnabled={impersonationEnabled}
            isAdmin={u.isAdmin}
            isCurrentUser={isCurrentUser}
            userEmail={u.email}
            userId={u.id}
          />
        }
        backHref="/orbit/users"
        description={u.email}
        portalHref={null}
        title={u.name || u.email}
      />

      <PageBody>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {u.isAdmin && <Badge variant="default">Admin</Badge>}
          {u.banned && <Badge variant="destructive">Banned</Badge>}
        </div>

        {/* Meta */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetaCard label="Joined" value={formatDateTime(u.createdAt)} />
          <MetaCard label="Last updated" value={formatDateTime(u.updatedAt)} />
          <MetaCard
            label="Sign-in methods"
            value={u.authMethods.length > 0 ? u.authMethods.join(", ") : "—"}
          />
          <MetaCard
            label="Workspaces"
            value={String(u.workspaceMemberships.length)}
          />
        </div>

        {u.banReason && (
          <div className="mt-4 rounded-ir-card border border-ir-danger/20 bg-ir-danger/5 p-4">
            <p className="text-sm font-semibold text-ir-danger">
              Ban reason: {u.banReason}
            </p>
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Workspace memberships */}
          <div className="min-w-0 rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs lg:col-span-3">
            <div className="border-b border-ir-border px-4 py-3">
              <h2 className="text-sm font-semibold text-ir-heading">
                Workspace Memberships ({u.workspaceMemberships.length})
              </h2>
            </div>
            {u.workspaceMemberships.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ir-muted">
                No workspace memberships.
              </p>
            ) : (
              <div className="divide-y divide-ir-border">
                {u.workspaceMemberships.map((m) => (
                  <div
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                    key={m.workspaceId}
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        className="truncate text-sm font-semibold text-ir-heading hover:underline"
                        href={`/orbit/workspaces/${m.workspaceId}`}
                      >
                        {m.workspaceName}
                      </Link>
                      <p className="truncate font-mono text-xs text-ir-muted">
                        /{m.workspaceSlug}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                      <Badge variant="secondary">{m.role}</Badge>
                      <span className="text-xs text-ir-muted">
                        {formatDateTime(m.joinedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Posts */}
          <div className="min-w-0 rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
            <div className="border-b border-ir-border px-4 py-3">
              <h2 className="text-sm font-semibold text-ir-heading">
                Recent Posts
              </h2>
            </div>
            {u.recentPosts.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ir-muted">No posts.</p>
            ) : (
              <div className="divide-y divide-ir-border">
                {u.recentPosts.map((p) => (
                  <div className="px-4 py-2.5" key={p.id}>
                    <p className="truncate text-sm font-medium text-ir-heading">
                      {p.title}
                    </p>
                    <p className="text-xs text-ir-muted">
                      {formatDateTime(p.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Comments */}
          <div className="min-w-0 rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
            <div className="border-b border-ir-border px-4 py-3">
              <h2 className="text-sm font-semibold text-ir-heading">
                Recent Comments
              </h2>
            </div>
            {u.recentComments.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ir-muted">No comments.</p>
            ) : (
              <div className="divide-y divide-ir-border">
                {u.recentComments.map((c) => (
                  <div className="px-4 py-2.5" key={c.id}>
                    <p className="line-clamp-2 text-sm text-ir-muted">
                      {c.body}
                    </p>
                    <p className="mt-0.5 text-xs text-ir-muted">
                      {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageBody>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-ir-card border border-ir-border bg-ir-surface p-4 shadow-ir-xs">
      <p className="text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-ir-heading">
        {value}
      </p>
    </div>
  );
}
