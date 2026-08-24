import { ChatCircleIcon } from "@phosphor-icons/react/dist/ssr";
import CommentModerationQueue from "@/components/comments/comment-moderation-queue";
import CommentThread from "@/components/comments/comment-thread";
import type {
  CommentApi,
  CommentData,
  ReplyData,
} from "@/components/comments/types";
import type { ChangelogCommentRow } from "@/lib/changelog-comments/queries";
import { listChangelogCommentsWithReplies } from "@/lib/changelog-comments/queries";
import { getReactionsForChangelogComments } from "@/lib/changelog-comments/reactions";

interface ChangelogCommentSectionProps {
  // Admins/owners: see unapproved comments + the moderation queue, and may
  // delete any comment.
  canModerate: boolean;
  changelogEntryId: string;
  currentUserId: string | null;
  isSignedIn: boolean;
}

// Changelog comments reuse the exact feedback comment UI (threaded replies,
// per-comment reactions, edit, image upload, moderation) via the shared
// CommentThread — only the endpoints differ, supplied through `api`.
export async function ChangelogCommentSection({
  changelogEntryId,
  canModerate,
  currentUserId,
  isSignedIn,
}: ChangelogCommentSectionProps) {
  const raw = await listChangelogCommentsWithReplies(changelogEntryId, {
    includeUnapproved: canModerate,
  });

  const allIds = [
    ...raw.map((c) => c.id),
    ...raw.flatMap((c) => c.replies.map((r) => r.id)),
  ];
  const reactionsMap = await getReactionsForChangelogComments(
    allIds,
    currentUserId
  );

  const api: CommentApi = {
    createUrl: `/api/changelog/${changelogEntryId}/comments`,
    commentBaseUrl: "/api/changelog/comments",
  };

  // `postId` carries the entry id to satisfy the shared CommentData shape; the
  // components only use it for the default (feedback) endpoint, which `api`
  // overrides here.
  const toData = (c: ChangelogCommentRow): ReplyData => ({
    id: c.id,
    postId: c.changelogEntryId,
    parentId: c.parentId,
    body: c.body,
    isDeleted: c.isDeleted,
    isApproved: c.isApproved,
    authorName: c.authorName,
    authorAvatar: c.authorAvatar,
    isGuest: !c.authorId,
    isOwn: !!currentUserId && c.authorId === currentUserId,
    createdAt: c.createdAt.toISOString(),
    reactions: (reactionsMap.get(c.id) ?? []).sort((a, b) => b.count - a.count),
  });

  const allComments: CommentData[] = raw.map((c) => ({
    ...toData(c),
    replies: c.replies.map(toData),
  }));

  const approvedCount = allComments.filter(
    (c) => c.isApproved && !c.isDeleted
  ).length;

  const pending = canModerate
    ? [
        ...allComments.filter((c) => !c.isApproved && !c.isDeleted),
        ...allComments.flatMap((c) =>
          c.replies.filter((r) => !r.isApproved && !r.isDeleted)
        ),
      ]
    : [];

  return (
    <div className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
      <div className="border-b border-ir-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ir-heading">
          <ChatCircleIcon className="size-4 text-ir-muted" />
          {approvedCount === 0
            ? "Comments"
            : `${approvedCount} ${approvedCount === 1 ? "comment" : "comments"}`}
        </h2>
      </div>

      <div className="px-5 py-4">
        <CommentThread
          api={api}
          canModerate={canModerate}
          initialComments={allComments}
          isLocked={false}
          isSignedIn={isSignedIn}
          postId={changelogEntryId}
        />

        {canModerate && pending.length > 0 && (
          <CommentModerationQueue api={api} pending={pending} />
        )}
      </div>
    </div>
  );
}
