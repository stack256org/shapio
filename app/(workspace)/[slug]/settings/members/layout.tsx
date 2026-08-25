import { notFound } from "next/navigation";
import { SetPageHeader } from "@/components/workspace/topbar";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function MembersSettingsLayout({
  children,
  params,
}: Props) {
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SetPageHeader
        description="Manage workspace membership and invitations."
        title="Team Members"
      />
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
