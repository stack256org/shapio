import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockedUsersSection } from "@/components/settings/blocked-users-section";
import { ModerationSettingsForm } from "@/components/settings/moderation-settings-form";
import { PendingCommentsSection } from "@/components/settings/pending-comments-section";
import { PendingPostsSection } from "@/components/settings/pending-posts-section";
import { ContentContainer } from "@/components/ui/page";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { getPendingComments } from "@/lib/comments/queries";
import { listBlockedUsers } from "@/lib/moderation/queries";
import { getPendingPosts } from "@/lib/posts/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Moderation — ${slug}` };
}

export default async function ModerationPage({ params }: Props) {
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

  const [pendingPosts, pendingComments, blockedUsers] = await Promise.all([
    getPendingPosts(workspace.id),
    getPendingComments(workspace.id),
    listBlockedUsers(workspace.id),
  ]);

  return (
    <ContentContainer className="space-y-10">
      <ModerationSettingsForm
        commentModeration={workspace.commentModeration}
        moderationMode={workspace.moderationMode}
        spamKeywords={workspace.spamKeywords}
        workspaceId={workspace.id}
      />

      <PendingPostsSection posts={pendingPosts} workspaceId={workspace.id} />

      <PendingCommentsSection
        comments={pendingComments}
        workspaceSlug={workspace.slug}
      />

      <BlockedUsersSection
        blockedUsers={blockedUsers}
        workspaceId={workspace.id}
      />
    </ContentContainer>
  );
}
