import type { ReactNode } from "react";
import { NamePromptModal } from "@/components/portal/name-prompt-modal";
import { WorkspaceSuspendedPage } from "@/components/workspace/workspace-suspended";
import { getWorkspaceBySlug } from "@/lib/workspaces/queries";

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

// The public portal (board, post, roadmap, changelog, profile) always renders
// its own clean top-nav shell via PortalHeader — never the admin workspace
// sidebar, even for signed-in members/admins viewing it themselves.
export default async function PublicSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);

  // A suspended workspace is unavailable to everyone (PLATFORM.md §6).
  if (workspace?.isSuspended) {
    return <WorkspaceSuspendedPage />;
  }

  return (
    <>
      <NamePromptModal />
      {children}
    </>
  );
}
