import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WORKSPACE_MEMBER, WORKSPACE_OWNER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { portalBaseUrl } from "@/lib/urls";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import { GeneralSettingsForm } from "./_components/general-settings-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `General Settings — ${slug}` };
}

export default async function GeneralSettingsPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  // Workspace settings are Brand Admin only (PLATFORM.md §7). Team Members are
  // denied (not-found, consistent with the other settings pages).
  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    notFound();
  }

  const canManage = true;
  const isOwner = member.role === WORKSPACE_OWNER;

  return (
    <GeneralSettingsForm
      canManage={canManage}
      changelogPublic={workspace.changelogPublic}
      isOwner={isOwner}
      portalUrl={portalBaseUrl()}
      roadmapPublic={workspace.roadmapPublic}
      workspaceDescription={workspace.description ?? ""}
      workspaceId={workspace.id}
      workspaceLogoUrl={workspace.logoUrl ?? ""}
      workspaceName={workspace.name}
      workspaceSlug={workspace.slug}
    />
  );
}
