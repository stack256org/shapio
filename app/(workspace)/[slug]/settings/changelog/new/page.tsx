import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChangelogEditor } from "@/components/changelog/changelog-editor";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { listChangelogLabels } from "@/lib/changelog/labels";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: "New Changelog Entry" };

export default async function NewChangelogEntryPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    notFound();
  }

  const initialLabels = await listChangelogLabels(workspace.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <ChangelogEditor
          initialLabels={initialLabels}
          pageTitle="New Entry"
          portalHref={null}
          workspaceId={workspace.id}
          workspaceSlug={slug}
        />
      </div>
    </div>
  );
}
