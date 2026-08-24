import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetailContent } from "@/components/posts/post-detail-content";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getPostMergeAudit } from "@/lib/audit/queries";
import { requireSession } from "@/lib/authz";
import { getBoardById } from "@/lib/boards/queries";
import { getActiveCategoriesForWorkspace } from "@/lib/categories/queries";
import { resolveBackTarget } from "@/lib/navigation/back-target";
import {
  getPost,
  listPostsMergedInto,
  listStatusHistory,
} from "@/lib/posts/queries";
import { hasUserVoted } from "@/lib/voting";
import { getActiveWorkspaceStatuses } from "@/lib/workspace-statuses/queries";
import { listMembers } from "@/lib/workspaces/members";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string; postId: string }>;
  searchParams: Promise<{ edit?: string; from?: string; fromLabel?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPost(postId);
  return { title: post?.title ?? "Post" };
}

export default async function AdminPostDetailPage({
  params,
  searchParams,
}: Props) {
  const { slug, postId } = await params;
  const { edit, from, fromLabel } = await searchParams;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) {
    notFound();
  }

  const post = await getPost(postId);
  if (!post || post.workspaceId !== workspace.id) {
    notFound();
  }

  const board = await getBoardById(post.boardId);
  if (!board) {
    notFound();
  }

  const isAdminOrOwner = member.role !== WORKSPACE_MEMBER;

  const [
    votedByUser,
    workspaceStatuses,
    categories,
    statusHistory,
    members,
    mergedPosts,
  ] = await Promise.all([
    hasUserVoted(post.id, { userId: session.user.id }),
    getActiveWorkspaceStatuses(workspace.id),
    getActiveCategoriesForWorkspace(workspace.id),
    listStatusHistory(post.id),
    listMembers(workspace.id),
    listPostsMergedInto(post.id),
  ]);
  const assignees = members.map((m) => ({
    id: m.userId,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
  }));

  // If this post was merged into another, resolve the target's URL plus
  // who/when the merge happened (from the audit log) for the notice.
  let mergedTarget: {
    href: string;
    mergedAt: Date | null;
    mergedByEmail: string | null;
    mergedByName: string | null;
    title: string;
  } | null = null;
  if (post.mergedIntoId) {
    const [target, mergeAudit] = await Promise.all([
      getPost(post.mergedIntoId),
      getPostMergeAudit(post.id),
    ]);
    if (target) {
      mergedTarget = {
        title: target.title,
        href: `/${slug}/feedback/${target.id}`,
        mergedAt: mergeAudit?.mergedAt ?? null,
        mergedByName: mergeAudit?.actorName ?? null,
        mergedByEmail: mergeAudit?.actorEmail ?? null,
      };
    }
  }

  // Back returns to the navigation origin (e.g. the Roadmap) when supplied,
  // otherwise to All Feedback.
  const back = resolveBackTarget({
    from,
    fromLabel,
    fallbackHref: `/${slug}/feedback`,
    fallbackLabel: board.name,
  });

  return (
    <PostDetailContent
      assignees={assignees}
      backLabel={back.label}
      boardHref={back.href}
      boardIsArchived={board.isArchived}
      categories={categories}
      currentUserId={session.user.id}
      defaultEditing={edit === "1"}
      isAdminOrOwner={isAdminOrOwner}
      isMember={true}
      isSignedIn={true}
      mergedPosts={mergedPosts.map((m) => ({
        ...m,
        href: `/${slug}/feedback/${m.id}`,
      }))}
      mergedTarget={mergedTarget}
      post={post}
      statusHistory={statusHistory}
      votedByUser={votedByUser}
      workspaceId={workspace.id}
      workspaceStatuses={workspaceStatuses}
    />
  );
}
