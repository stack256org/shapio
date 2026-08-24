import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentContainer } from "@/components/ui/page";
import {
  ADMIN_ROLE,
  WORKSPACE_MEMBER,
  WORKSPACE_OWNER,
} from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { isSmtpConfigured } from "@/lib/integration-settings";
import { adminBaseUrl } from "@/lib/urls";
import { listActiveInviteLinks } from "@/lib/workspaces/invite-links";
import { listPendingInvites } from "@/lib/workspaces/invites";
import { listMembers } from "@/lib/workspaces/members";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import { CreateLinkForm } from "./_components/create-link-form";
import { InviteLinksList } from "./_components/invite-links-list";
import { MembersTable } from "./_components/members-table";
import { PendingInvitesList } from "./_components/pending-invites-list";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Members — ${slug}` };
}

export default async function MembersPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  // Workspace settings are Brand Admin only (PLATFORM.md §7).
  const actorMember = await getWorkspaceMember(workspace.id, session.user.id);
  if (!actorMember || actorMember.role === WORKSPACE_MEMBER) {
    notFound();
  }

  const canManageAdmin = actorMember.role === WORKSPACE_OWNER;
  const isOrbitAdmin = session.user.role === ADMIN_ROLE;

  const [members, pendingInvites, activeLinks, smtpConfigured] =
    await Promise.all([
      listMembers(workspace.id),
      listPendingInvites(workspace.id),
      listActiveInviteLinks(workspace.id),
      isSmtpConfigured(),
    ]);

  const appUrl = adminBaseUrl();

  return (
    <ContentContainer className="space-y-6">
      <MembersTable
        actorRole={actorMember.role}
        actorUserId={session.user.id}
        canInviteAdmin={canManageAdmin}
        isOrbitAdmin={isOrbitAdmin}
        members={members}
        smtpConfigured={smtpConfigured}
        workspaceId={workspace.id}
      />

      <div className="space-y-6 rounded-ir-card border border-ir-border bg-ir-surface p-5 shadow-ir-xs sm:p-6">
        <CreateLinkForm
          appUrl={appUrl}
          canCreateAdmin={canManageAdmin}
          workspaceId={workspace.id}
        />
        <InviteLinksList
          canManage
          links={activeLinks}
          workspaceId={workspace.id}
        />
      </div>

      <div className="rounded-ir-card border border-ir-border bg-ir-surface p-5 shadow-ir-xs sm:p-6">
        <PendingInvitesList
          actorRole={actorMember.role}
          canManage
          invites={pendingInvites}
          workspaceId={workspace.id}
        />
      </div>
    </ContentContainer>
  );
}
