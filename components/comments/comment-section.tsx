import { ChatCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { listComments } from "@/lib/comments";
import { getReactionsForComments } from "@/lib/comments/reactions";
import CommentModerationQueue from "./comment-moderation-queue";
import CommentThread from "./comment-thread";
import type { CommentData, ReplyData } from "./types";

interface CommentSectionProps {
  canModerate: boolean;
  // May the viewer write a comment? True for a signed-in account and for an
  // accountless portal visitor who has verified their email. Defaults to
  // isSignedIn so callers without accountless participation are unaffected.
  canParticipate?: boolean;
  currentUserId: string | null;
  isLocked: boolean;
  isSignedIn: boolean;
  postId: string;
}

export default async function CommentSection({
  postId,
  isSignedIn,
  canParticipate,
  isLocked,
  currentUserId,
  canModerate,
}: CommentSectionProps) {
  const raw = await listComments(postId, { includeUnapproved: canModerate });

  // Collect all comment IDs for batch reaction fetch
  const allIds = [
    ...raw.map((c) => c.id),
    ...raw.flatMap((c) => c.replies.map((r) => r.id)),
  ];

  const reactionsMap = await getReactionsForComments(allIds, currentUserId);

  // Serialize to client-safe types
  const allComments: CommentData[] = raw.map((c) => ({
    id: c.id,
    postId: c.postId,
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
    replies: c.replies.map(
      (r): ReplyData => ({
        id: r.id,
        postId: r.postId,
        parentId: r.parentId,
        body: r.body,
        isDeleted: r.isDeleted,
        isApproved: r.isApproved,
        authorName: r.authorName,
        authorAvatar: r.authorAvatar,
        isGuest: !r.authorId,
        isOwn: !!currentUserId && r.authorId === currentUserId,
        createdAt: r.createdAt.toISOString(),
        reactions: (reactionsMap.get(r.id) ?? []).sort(
          (a, b) => b.count - a.count
        ),
      })
    ),
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
          canModerate={canModerate}
          canParticipate={canParticipate ?? isSignedIn}
          initialComments={allComments}
          isLocked={isLocked}
          isSignedIn={isSignedIn}
          postId={postId}
        />

        {canModerate && pending.length > 0 && (
          <CommentModerationQueue pending={pending} />
        )}
      </div>
    </div>
  );
}
