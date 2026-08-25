import { notFound } from "next/navigation";
import { WorkspaceActionsPanel } from "@/components/orbit/workspace-actions-panel";
import { Badge } from "@/components/ui/badge";
import { PageBody } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { getOrbitWorkspace } from "@/lib/orbit/workspaces";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Workspace Detail" };

interface Props {
  params: Promise<{ workspaceId: string }>;
}

export default async function OrbitWorkspaceDetailPage({ params }: Props) {
  const { workspaceId } = await params;
  const ws = await getOrbitWorkspace(workspaceId);

  if (!ws) {
    notFound();
  }

  return (
    <div className="flex min-w-0 flex-col">
      <SetPageHeader
        actions={
          <WorkspaceActionsPanel
            isSuspended={ws.isSuspended}
            workspaceId={ws.id}
            workspaceSlug={ws.slug}
          />
        }
        backHref="/orbit/workspaces"
        description={ws.description ?? `/${ws.slug}`}
        portalHref={null}
        title={ws.name}
      />

      <PageBody>
        <div className="mb-5 flex items-center gap-3">
          <Badge variant={ws.isSuspended ? "destructive" : "default"}>
            {ws.isSuspended ? "Suspended" : "Active"}
          </Badge>
          <span className="font-mono text-xs text-ir-muted">/{ws.slug}</span>
        </div>

        {/* Meta */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetaCard label="Owner" value={ws.ownerEmail ?? "—"} />
          <MetaCard label="Members" value={String(ws.memberCount)} />
          <MetaCard label="Posts" value={String(ws.postCount)} />
          <MetaCard label="Created" value={formatDateTime(ws.createdAt)} />
        </div>

        {ws.isSuspended && ws.suspendedAt && (
          <div className="mt-4 rounded-ir-card border border-ir-danger/20 bg-ir-danger/5 p-4">
            <p className="text-sm font-semibold text-ir-danger">
              Suspended on {formatDateTime(ws.suspendedAt)}
            </p>
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Boards */}
          <div className="min-w-0 rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
            <div className="border-b border-ir-border px-4 py-3">
              <h2 className="text-sm font-semibold text-ir-heading">
                Boards ({ws.boards.length})
              </h2>
            </div>
            <div className="divide-y divide-ir-border">
              {ws.boards.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ir-muted">No boards.</p>
              ) : (
                ws.boards.map((b) => (
                  <div className="px-4 py-2.5" key={b.id}>
                    <p className="truncate text-sm font-medium text-ir-heading">
                      {b.name}
                    </p>
                    <p className="truncate font-mono text-xs text-ir-muted">
                      /{b.slug}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="min-w-0 rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
            <div className="border-b border-ir-border px-4 py-3">
              <h2 className="text-sm font-semibold text-ir-heading">
                Categories ({ws.categories.length})
              </h2>
            </div>
            <div className="divide-y divide-ir-border">
              {ws.categories.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ir-muted">
                  No categories.
                </p>
              ) : (
                ws.categories.map((c) => (
                  <div className="px-4 py-2.5" key={c.id}>
                    <p className="truncate text-sm text-ir-body">{c.name}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Posts */}
          <div className="min-w-0 rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
            <div className="border-b border-ir-border px-4 py-3">
              <h2 className="text-sm font-semibold text-ir-heading">
                Recent Posts
              </h2>
            </div>
            <div className="divide-y divide-ir-border">
              {ws.recentPosts.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ir-muted">No posts yet.</p>
              ) : (
                ws.recentPosts.map((p) => (
                  <div className="px-4 py-2.5" key={p.id}>
                    <p className="truncate text-sm font-medium text-ir-heading">
                      {p.title}
                    </p>
                    <p className="text-xs text-ir-muted">
                      {formatDateTime(p.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
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
