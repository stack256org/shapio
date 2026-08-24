"use client";

import { GitMergeIcon, PushPinIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RowCheckbox } from "@/components/posts/bulk-selection-context";
import CategorySelect from "@/components/posts/category-select";
import { PostActionsMenu } from "@/components/posts/post-actions-menu";
import type { PostsTableRow } from "@/components/posts/posts-table";
import StatusSelect from "@/components/posts/status-select";
import VisibilityToggle from "@/components/posts/visibility-toggle";
import { RelativeTime } from "@/components/ui/relative-time";
import VoteButton from "@/components/voting/vote-button";
import { truncateHtmlToText } from "@/lib/changelog/html";

interface Category {
  color: string;
  id: string;
  name: string;
}

interface WorkspaceStatus {
  color: string;
  id: string;
  isArchived: boolean;
  isSystem: boolean;
  name: string;
  slug: string;
}

interface PostRowProps {
  categories: Category[];
  href: string;
  isAdminOrOwner: boolean;
  isMember: boolean;
  isSignedIn: boolean;
  // Link target for the "Merged into <title>" badge; null shows the target
  // title as plain text (e.g. the target itself couldn't be resolved).
  mergedIntoHref?: string | null;
  post: PostsTableRow;
  selectable?: boolean;
  showBoardColumn: boolean;
  workspaceId: string;
  workspaceStatuses: WorkspaceStatus[];
}

// The whole row navigates to the post on click, matching the public board
// list's pattern — only interactive controls (vote, category/status/visibility
// selects) opt out (stopPropagation) so using them doesn't also trigger
// navigation. The title keeps a real <Link> so keyboard nav, middle-click, and
// "open in new tab" still work.
export function PostRow({
  post,
  categories,
  workspaceStatuses,
  href,
  isSignedIn,
  isAdminOrOwner,
  isMember,
  workspaceId,
  mergedIntoHref,
  selectable = false,
  showBoardColumn,
}: PostRowProps) {
  const router = useRouter();
  const isMerged = !!post.mergedIntoId;

  return (
    <tr
      className={`group cursor-pointer transition-colors duration-150 ease-ir-standard hover:bg-ir-border/60 ${
        isMerged ? "bg-ir-muted-surface/40" : ""
      }`}
      onClick={() => router.push(href)}
    >
      {selectable && (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: only fences off row-click bubbling from the checkbox inside, not a new interaction
        // biome-ignore lint/a11y/useKeyWithClickEvents: same — stopPropagation only, no new behavior to make keyboard-reachable
        <td
          className={`sticky left-0 z-10 border-r border-ir-border bg-ir-surface px-4 py-3 align-middle transition-colors duration-150 ease-ir-standard group-hover:bg-ir-muted-surface ${
            isMerged ? "bg-ir-muted-surface/40" : ""
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <RowCheckbox id={post.id} label={post.title} />
        </td>
      )}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: only fences off row-click bubbling from the interactive control inside, not a new interaction */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — stopPropagation only, no new behavior to make keyboard-reachable */}
      <td
        className="px-4 py-3 align-middle"
        onClick={(e) => e.stopPropagation()}
      >
        <VoteButton
          initialCount={post.upvotes}
          initialHasVoted={post.hasVoted}
          isSignedIn={isSignedIn}
          postId={post.id}
        />
      </td>
      <td className="max-w-64 px-4 py-3 align-middle">
        <div className="flex min-w-0 items-center gap-2">
          {post.isPinned && (
            <span
              className="inline-flex shrink-0 items-center text-ir-primary"
              title="Pinned"
            >
              <PushPinIcon className="size-3.5" weight="fill" />
              <span className="sr-only">Pinned</span>
            </span>
          )}
          <Link
            className={`min-w-0 truncate font-medium transition-colors duration-150 ease-ir-standard hover:text-ir-primary hover:underline focus-visible:outline-none focus-visible:underline ${
              isMerged ? "text-ir-muted" : "text-ir-heading"
            }`}
            href={href}
            title={post.title}
          >
            {post.title}
          </Link>
          {isMerged && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-ir-full bg-ir-muted-surface px-2 py-0.5 text-[11px] font-medium text-ir-muted">
              <GitMergeIcon className="size-3" />
              Merged
            </span>
          )}
          {!isMerged && !!post.mergedCount && post.mergedCount > 0 && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-ir-full bg-ir-primary-light/15 px-2 py-0.5 text-[11px] font-medium text-ir-primary"
              title={`${post.mergedCount} ${post.mergedCount === 1 ? "post" : "posts"} merged into this`}
            >
              <GitMergeIcon className="size-3" />
              {post.mergedCount} merged
            </span>
          )}
          {post.isDraft && (
            <span className="inline-flex shrink-0 items-center rounded-ir-full bg-ir-warning/10 px-2 py-0.5 text-[11px] font-medium text-ir-warning">
              Draft
            </span>
          )}
        </div>
        {isMerged ? (
          <p className="mt-0.5 truncate text-xs text-ir-muted">
            Merged into{" "}
            {mergedIntoHref ? (
              <Link
                className="font-medium text-ir-body hover:text-ir-primary hover:underline"
                href={mergedIntoHref}
                onClick={(e) => e.stopPropagation()}
              >
                {post.mergedIntoTitle ?? "another post"}
              </Link>
            ) : (
              <span className="font-medium text-ir-body">
                {post.mergedIntoTitle ?? "another post"}
              </span>
            )}
          </p>
        ) : (
          showBoardColumn && (
            <p className="mt-0.5 truncate text-xs text-ir-muted">
              {post.boardName}
            </p>
          )
        )}
      </td>
      <td className="hidden max-w-72 px-4 py-3 align-middle lg:table-cell">
        <p className="line-clamp-2 text-xs text-ir-muted">
          {post.body ? truncateHtmlToText(post.body, 200) : "—"}
        </p>
      </td>
      <td className="hidden max-w-32 px-4 py-3 align-middle sm:table-cell">
        <p className="truncate text-xs text-ir-muted">
          {post.authorName || post.authorEmail}
        </p>
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 align-middle text-xs text-ir-muted sm:table-cell">
        <RelativeTime date={post.createdAt} options={{ addSuffix: true }} />
      </td>
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: only fences off row-click bubbling from the selects inside, not a new interaction */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — stopPropagation only, no new behavior to make keyboard-reachable */}
      <td
        className="hidden px-4 py-3 align-middle md:table-cell"
        onClick={(e) => e.stopPropagation()}
      >
        <CategorySelect
          canEdit={isMember}
          categories={categories}
          currentCategoryId={post.categoryId}
          postId={post.id}
          workspaceId={workspaceId}
        />
      </td>
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: only fences off row-click bubbling from the selects inside, not a new interaction */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — stopPropagation only, no new behavior to make keyboard-reachable */}
      <td
        className="px-4 py-3 align-middle"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusSelect
          canEdit={isMember}
          currentStatus={post.status}
          isDraft={post.isDraft}
          postId={post.id}
          workspaceId={workspaceId}
          workspaceStatuses={workspaceStatuses}
        />
      </td>
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: only fences off row-click bubbling from the selects inside, not a new interaction */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — stopPropagation only, no new behavior to make keyboard-reachable */}
      <td
        className="px-4 py-3 align-middle"
        onClick={(e) => e.stopPropagation()}
      >
        <VisibilityToggle
          canEdit={isAdminOrOwner}
          isApproved={post.isApproved}
          isDraft={post.isDraft}
          postId={post.id}
          workspaceId={workspaceId}
        />
      </td>
      {isMember && (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: only fences off row-click bubbling from the menu inside, not a new interaction
        // biome-ignore lint/a11y/useKeyWithClickEvents: same — stopPropagation only, no new behavior to make keyboard-reachable
        <td
          className="px-4 py-3 align-middle"
          onClick={(e) => e.stopPropagation()}
        >
          <PostActionsMenu
            detailHref={href}
            isDraft={post.isDraft}
            isPinned={post.isPinned}
            mergedIntoId={post.mergedIntoId}
            postCommentCount={post.commentCount}
            postId={post.id}
            postTitle={post.title}
            workspaceId={workspaceId}
          />
        </td>
      )}
    </tr>
  );
}
