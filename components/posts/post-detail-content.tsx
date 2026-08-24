import {
  ArrowLeftIcon,
  GitMergeIcon,
  NotePencilIcon,
} from "@phosphor-icons/react/dist/ssr";
import { format } from "date-fns";
import Link from "next/link";
import CommentSection from "@/components/comments/comment-section";
import AssigneeSelect from "@/components/posts/assignee-select";
import CategorySelect from "@/components/posts/category-select";
import DeletePostButton from "@/components/posts/delete-post-button";
import MergePostButton from "@/components/posts/merge-post-button";
import PinButton from "@/components/posts/pin-button";
import {
  EditablePostContent,
  EditableTitle,
  EditPostControls,
  PostEditProvider,
} from "@/components/posts/post-inline-edit";
import PublishDraftButton from "@/components/posts/publish-draft-button";
import StatusSelect from "@/components/posts/status-select";
import UnmergePostButton from "@/components/posts/unmerge-post-button";
import VoterListButton from "@/components/posts/voter-list-button";
import { Button } from "@/components/ui/button";
import VoteButton from "@/components/voting/vote-button";
import { SetPageHeader } from "@/components/workspace/topbar";

interface Category {
  color: string;
  id: string;
  name: string;
}

interface Assignee {
  email: string;
  id: string;
  image: string | null;
  name: string | null;
}

interface WorkspaceStatus {
  color: string;
  id: string;
  isArchived: boolean;
  isSystem: boolean;
  name: string;
  slug: string;
}

interface StatusHistoryEntry {
  changedByName: string | null;
  createdAt: Date;
  fromStatus: string | null;
  id: string;
  toStatus: string;
}

interface PostDetailPost {
  assignedToId: string | null;
  authorEmail: string;
  authorId: string | null;
  authorName: string | null;
  boardId: string;
  body: string | null;
  categoryId: string | null;
  commentCount: number;
  createdAt: Date;
  id: string;
  imageUrl: string | null;
  isDraft: boolean;
  isLocked: boolean;
  isPinned: boolean;
  mergedIntoId: string | null;
  slug: string;
  status: string;
  title: string;
  updatedAt: Date;
  upvotes: number;
}

interface PostDetailContentProps {
  assignees: Assignee[];
  backLabel: string;
  boardHref: string;
  boardIsArchived: boolean;
  // Whether the viewer may vote and comment: a signed-in account, or an
  // accountless Public Portal visitor who has verified their email. Defaults
  // to isSignedIn, so the admin route is unaffected.
  canParticipate?: boolean;
  categories: Category[];
  currentUserId: string | null;
  defaultEditing?: boolean;
  embedQuery?: string;
  isAdminOrOwner: boolean;
  isEmbed?: boolean;
  isMember: boolean;
  // The public route stacks this under its own sticky PortalHeader (h-16);
  // the admin route has no header above it, so this bar sticks to the very
  // top instead.
  isPublicPortal?: boolean;
  isSignedIn: boolean;
  // Other feedback merged into this post — the reverse of mergedTarget.
  // Absent on the public portal route, which doesn't surface merge history.
  mergedPosts?: Array<{
    createdAt: Date;
    href: string;
    id: string;
    status: string;
    title: string;
    upvotes: number;
  }>;
  mergedTarget: {
    href: string;
    // Who/when the merge happened — resolved from the audit log (no
    // denormalized field on the post itself). Absent if that log entry is
    // gone; the notice still renders without a date/actor in that case.
    mergedAt?: Date | null;
    mergedByEmail?: string | null;
    mergedByName?: string | null;
    title: string;
  } | null;
  post: PostDetailPost;
  statusHistory: StatusHistoryEntry[];
  votedByUser: boolean;
  workspaceId: string;
  workspaceStatuses: WorkspaceStatus[];
}

// Shared content for a single feedback post — everything below the shell
// (PortalHeader for the public route, the admin sidebar layout for the
// workspace route). Both `(public)/[slug]/b/[boardSlug]/p/[postSlug]` and
// `(workspace)/[slug]/feedback/[postId]` render this with the same data,
// differing only in boardHref/backLabel and embed support.
export function PostDetailContent({
  post,
  boardHref,
  backLabel,
  boardIsArchived,
  isEmbed = false,
  isSignedIn,
  canParticipate = isSignedIn,
  isMember,
  isPublicPortal = false,
  isAdminOrOwner,
  votedByUser,
  workspaceStatuses,
  categories,
  assignees,
  statusHistory,
  mergedPosts = [],
  mergedTarget,
  workspaceId,
  currentUserId,
  defaultEditing = false,
}: PostDetailContentProps) {
  const isAuthor = !!currentUserId && post.authorId === currentUserId;
  const canEdit = isAuthor || isAdminOrOwner;
  // The address behind an accountless post is moderation data, not a public
  // byline — only workspace members fall back to it when no name was given.
  const authorLabel =
    post.authorName?.trim() || (isMember ? post.authorEmail : "User");
  const statusMap = new Map(workspaceStatuses.map((s) => [s.slug, s.name]));

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      {/* Back nav — hidden in embed mode (no navigation chrome). On the public
        portal this keeps its own sticky bar (offset below the portal's own
        sticky header); in the admin workspace it's reported to the shared,
        layout-owned Topbar instead. */}
      {!isEmbed &&
        (isPublicPortal ? (
          <div className="sticky top-16 z-10 border-b border-ir-border bg-ir-background px-4 py-4 sm:px-8">
            <Link
              className="inline-flex items-center gap-1.5 text-sm text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
              href={boardHref}
            >
              <ArrowLeftIcon className="size-4" />
              {backLabel}
            </Link>
          </div>
        ) : (
          <SetPageHeader backHref={boardHref} title={backLabel} />
        ))}

      <div className="px-4 py-8 sm:px-8">
        <PostEditProvider
          canEdit={canEdit}
          defaultEditing={defaultEditing}
          initialBody={post.body}
          initialImageUrl={post.imageUrl}
          initialTitle={post.title}
          postId={post.id}
          workspaceId={workspaceId}
        >
          {/* Draft banner — members only; the public route 404s drafts so this
            only ever renders in the admin feedback view. */}
          {post.isDraft && isMember && (
            <div className="mb-6 flex flex-col gap-3 rounded-ir-card border border-ir-warning/30 bg-ir-warning/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <NotePencilIcon className="mt-0.5 size-4 shrink-0 text-ir-warning" />
                <div>
                  <p className="text-sm font-medium text-ir-heading">
                    This feedback is a draft
                  </p>
                  <p className="mt-0.5 text-xs text-ir-muted">
                    It isn't visible on your public portal, roadmap, changelog,
                    or API, and no notifications have been sent. Publish it to
                    make it visible.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <PublishDraftButton
                  postId={post.id}
                  workspaceId={workspaceId}
                />
              </div>
            </div>
          )}

          {/* Post header — title/badges are a bounded-width column (not
            flex-1), so the row's total width is just "title column + gap +
            vote button", however wide the page itself is. Previously the
            title column used flex-1, which stretched it to fill the whole
            (wide) page, so a short title left a large empty gap before the
            vote button trailing after it. Bounding the width instead of
            growing it keeps the vote button right next to the title at any
            screen size, with no gap possible. */}
          <div className="flex items-start gap-3">
            <div className="min-w-0 max-w-2xl flex-1">
              <EditableTitle
                className="text-xl font-semibold leading-snug text-ir-heading"
                title={post.title}
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <StatusSelect
                  canEdit={isMember}
                  currentStatus={post.status}
                  isDraft={post.isDraft}
                  postId={post.id}
                  workspaceId={workspaceId}
                  workspaceStatuses={workspaceStatuses}
                />
                <CategorySelect
                  canEdit={isMember}
                  categories={categories}
                  currentCategoryId={post.categoryId}
                  postId={post.id}
                  workspaceId={workspaceId}
                />
                {isMember && (
                  <AssigneeSelect
                    assignees={assignees}
                    canEdit={isAdminOrOwner}
                    currentAssigneeId={post.assignedToId}
                    postId={post.id}
                    workspaceId={workspaceId}
                  />
                )}
                <span className="text-xs text-ir-muted">by {authorLabel}</span>
                <span className="text-xs text-ir-muted">
                  {format(post.createdAt, "MMM d, yyyy")}
                </span>
                {post.updatedAt > post.createdAt && (
                  <span className="text-xs text-ir-muted/60">
                    edited {format(post.updatedAt, "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </div>

            {/* Vote button + voter list */}
            <div className="flex shrink-0 flex-col items-center gap-2">
              <VoteButton
                initialCount={post.upvotes}
                initialHasVoted={votedByUser}
                isArchived={boardIsArchived}
                isSignedIn={canParticipate}
                postId={post.id}
              />
              {isMember && (
                <VoterListButton postId={post.id} voteCount={post.upvotes} />
              )}
            </div>
          </div>

          {/* Merged notice — deliberately prominent (not the muted/gray
            treatment used elsewhere) so nobody mistakes this for a still-
            active item. Votes have already moved to the destination and
            this post is locked (see MergePostButton's confirmation copy). */}
          {mergedTarget && (
            <div className="mt-4 flex flex-col gap-3 rounded-ir-card border border-ir-primary/25 bg-ir-primary-light/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <GitMergeIcon className="mt-0.5 size-4 shrink-0 text-ir-primary" />
                <div>
                  <p className="text-sm font-medium text-ir-heading">
                    This feedback has been merged into{" "}
                    <Link
                      className="text-ir-primary hover:underline"
                      href={mergedTarget.href}
                    >
                      {mergedTarget.title}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-xs text-ir-muted">
                    Votes have moved to the destination; this item is locked and
                    no longer active.
                    {mergedTarget.mergedAt && (
                      <>
                        {" "}
                        Merged {format(mergedTarget.mergedAt, "MMM d, yyyy")}
                        {isMember && mergedTarget.mergedByName
                          ? ` by ${mergedTarget.mergedByName}`
                          : ""}
                        .
                      </>
                    )}
                  </p>
                </div>
              </div>
              <Button asChild className="shrink-0" size="sm" variant="outline">
                <Link href={mergedTarget.href}>Open destination</Link>
              </Button>
            </div>
          )}

          {/* Merged feedback — other posts folded into this one. They no
            longer appear in the All Feedback table (see excludeMerged in
            listWorkspacePosts), so this is the only place left to find and
            open them, e.g. to unmerge one. */}
          {isMember && mergedPosts.length > 0 && (
            <div className="mt-4 rounded-ir-card border border-ir-border bg-ir-muted-surface/40 px-4 py-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ir-muted">
                <GitMergeIcon className="size-3.5 shrink-0" />
                Merged feedback ({mergedPosts.length})
              </p>
              <ul className="space-y-1.5">
                {mergedPosts.map((merged) => (
                  <li
                    className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs"
                    key={merged.id}
                  >
                    <Link
                      className="text-ir-heading hover:text-ir-primary hover:underline"
                      href={merged.href}
                    >
                      {merged.title}
                    </Link>
                    <span className="text-ir-muted">
                      · {merged.upvotes}{" "}
                      {merged.upvotes === 1 ? "vote" : "votes"} ·{" "}
                      {format(merged.createdAt, "MMM d, yyyy")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Post body + image — read-only, or the editor + image upload when
            editing (title stays editable in the header above). */}
          <EditablePostContent
            body={post.body}
            className="text-sm leading-relaxed text-ir-body wrap-break-word"
            imageUrl={post.imageUrl}
          />

          {/* Triage / clean-up actions (workspace members) and author delete */}
          {(isMember || isAuthor) && (
            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-ir-border pt-4">
              {isMember && (
                <PinButton
                  isPinned={post.isPinned}
                  postId={post.id}
                  workspaceId={workspaceId}
                />
              )}
              {isMember && !post.mergedIntoId && (
                <MergePostButton
                  postCommentCount={post.commentCount}
                  postId={post.id}
                  postTitle={post.title}
                  workspaceId={workspaceId}
                />
              )}
              {isMember && post.mergedIntoId && (
                <UnmergePostButton
                  postId={post.id}
                  postTitle={post.title}
                  workspaceId={workspaceId}
                />
              )}
              <EditPostControls />
              <DeletePostButton
                boardHref={boardHref}
                postId={post.id}
                workspaceId={workspaceId}
              />
            </div>
          )}

          {/* Status history */}
          {statusHistory.length > 0 && (
            <div className="mt-6 border-t border-ir-border pt-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ir-muted">
                Status history
              </h2>
              <ul className="space-y-2">
                {statusHistory.map((entry) => (
                  <li
                    className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ir-muted"
                    key={entry.id}
                  >
                    <span className="text-ir-heading">
                      {entry.fromStatus
                        ? `${statusMap.get(entry.fromStatus) ?? entry.fromStatus} → `
                        : ""}
                      {statusMap.get(entry.toStatus) ?? entry.toStatus}
                    </span>
                    <span>·</span>
                    <time dateTime={entry.createdAt.toISOString()}>
                      {format(entry.createdAt, "MMM d, yyyy")}
                    </time>
                    {isMember && entry.changedByName && (
                      <>
                        <span>·</span>
                        <span>by {entry.changedByName}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comments */}
          <div className="mt-6">
            <CommentSection
              canModerate={isAdminOrOwner}
              canParticipate={canParticipate}
              currentUserId={currentUserId}
              isLocked={post.isLocked}
              isSignedIn={isSignedIn}
              postId={post.id}
            />
          </div>
        </PostEditProvider>
      </div>
    </div>
  );
}
