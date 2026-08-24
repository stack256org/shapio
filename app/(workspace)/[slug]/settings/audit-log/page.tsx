import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditLogTable } from "@/components/settings/audit-log-table";
import { PageBody } from "@/components/ui/page";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { listAuditLogs } from "@/lib/audit/queries";
import { requireSession } from "@/lib/authz";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    action?: string;
    entityType?: string;
    actor?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Audit Log — ${slug}` };
}

export default async function AuditLogPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr, action, entityType, actor } = await searchParams;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    notFound();
  }

  const page = Math.max(1, Number(pageStr ?? 1));
  const limit = 50;

  const { logs, total, hasMore } = await listAuditLogs(workspace.id, {
    page,
    limit,
    action: action || undefined,
    entityType: entityType || undefined,
    actorEmail: actor || undefined,
  });

  return (
    <PageBody>
      <AuditLogTable
        filterAction={action}
        filterActor={actor}
        filterEntityType={entityType}
        hasMore={hasMore}
        limit={limit}
        logs={logs}
        page={page}
        total={total}
        workspaceSlug={workspace.slug}
      />
    </PageBody>
  );
}
