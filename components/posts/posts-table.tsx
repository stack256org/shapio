import { BulkActionBar } from "@/components/posts/bulk-action-bar";
import {
  BulkSelectionProvider,
  SelectAllCheckbox,
} from "@/components/posts/bulk-selection-context";
import { PostRow } from "@/components/posts/post-row";
import { PostsEmptyState } from "@/components/posts/posts-empty-state";
import { cn } from "@/lib/utils";

// Pinned to the top of the nearest scrolling ancestor — only correct when
// that ancestor is a bounded overflow-y-auto region (Feedback page). On
// Dashboard/Profile, PostsTable sits directly in the page flow below the
// workspace shell's own sticky top-0 header, so turning this on there would
// stick the column header at the same y-offset and paint over it.
const STICKY_HEADER_CELL =
  "sticky top-0 z-20 border-b border-ir-border bg-ir-surface";

// Per the CSS Overflow spec, an element with overflow-x set to anything but
// `visible` forces its overflow-y to compute as `auto` too, even if you
// explicitly set overflow-y to `visible` — that computed `auto` makes the
// element a scroll container in its own right. Normally that's exactly what
// the `overflow-x-auto` wrapper below wants. But it means a sticky thead
// inside it anchors `top: 0` to *this* div — which never itself has a
// bounded height, so it silently never appears to stick — instead of the
// real bounded/scrolling ancestor the caller provides for stickyHeader mode.
// So in that mode we skip this wrapper entirely and let the caller's own
// scroll container (which already needs `overflow-x-auto` added alongside
// its overflow-y-auto) handle both axes directly.

export interface PostsTableRow {
  authorEmail: string;
  authorName: string | null;
  boardIsPublic: boolean;
  boardName: string;
  boardSlug: string;
  body: string | null;
  categoryId: string | null;
  commentCount: number;
  createdAt: Date;
  hasVoted: boolean;
  id: string;
  isApproved: boolean;
  isDraft: boolean;
  isPinned: boolean;
  // Count of other posts merged into this one — renders a "N merged" badge
  // on the parent row so merge history is visible without opening the post.
  mergedCount?: number;
  // Set when this post was merged into another. mergedIntoTitle/Slug/BoardSlug
  // are resolved via a join so the row can show a "Merged into" badge/link
  // without a follow-up query; they're null if the target itself is gone.
  mergedIntoBoardSlug?: string | null;
  mergedIntoId?: string | null;
  mergedIntoSlug?: string | null;
  mergedIntoTitle?: string | null;
  slug: string;
  status: string;
  title: string;
  upvotes: number;
}

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

interface PostsTableProps {
  categories: Category[];
  // Opt-in bulk select + floating action bar — only the admin feedback list
  // page enables this; Dashboard and the public profile page never pass it,
  // so they render exactly as before.
  enableBulkActions?: boolean;
  isAdminOrOwner: boolean;
  isMember: boolean;
  isSignedIn: boolean;
  // Builds the link target for a merged row's "Merged into <title>" badge —
  // same admin-vs-public split as postHref below, applied to the merge
  // target instead of the row itself. Returns null when there's nowhere
  // sensible to link (no target info resolved), in which case the badge
  // still shows but as plain text.
  mergedIntoHref?: (post: PostsTableRow) => string | null;
  // Builds the link target for a post row — differs between the admin
  // (workspace-shelled) and public post-detail routes, which are genuinely
  // separate pages so members never get redirected out of their admin shell.
  postHref: (post: PostsTableRow) => string;
  posts: PostsTableRow[];
  showBoardColumn?: boolean;
  // Opt-in: pins the column header (<thead>) to the top of the nearest
  // scrolling ancestor. Only pass this where PostsTable is wrapped in its
  // own bounded overflow-y-auto region — see the STICKY_HEADER_CELL note.
  stickyHeader?: boolean;
  workspaceId: string;
  workspaceStatuses: WorkspaceStatus[];
}

export function PostsTable({
  posts,
  categories,
  workspaceStatuses,
  postHref,
  mergedIntoHref,
  isSignedIn,
  isAdminOrOwner,
  isMember,
  workspaceId,
  showBoardColumn = true,
  enableBulkActions = false,
  stickyHeader = false,
}: PostsTableProps) {
  if (posts.length === 0) {
    return <PostsEmptyState />;
  }

  const selectable = enableBulkActions && isMember;

  const tableElement = (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ir-border">
          {selectable && (
            <th
              className={cn(
                "sticky left-0 w-10 rounded-tl-ir-card border-r border-ir-border bg-ir-surface px-4 py-2.5",
                stickyHeader ? "top-0 z-30 border-b" : "z-10"
              )}
            >
              <SelectAllCheckbox />
            </th>
          )}
          <th
            className={cn(
              "w-16 px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted",
              stickyHeader && STICKY_HEADER_CELL
            )}
          >
            Votes
          </th>
          <th
            className={cn(
              "px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted",
              stickyHeader && STICKY_HEADER_CELL
            )}
          >
            Title
          </th>
          <th
            className={cn(
              "hidden px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted lg:table-cell",
              stickyHeader && STICKY_HEADER_CELL
            )}
          >
            Description
          </th>
          <th
            className={cn(
              "hidden px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted sm:table-cell",
              stickyHeader && STICKY_HEADER_CELL
            )}
          >
            Author
          </th>
          <th
            className={cn(
              "hidden px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted sm:table-cell",
              stickyHeader && STICKY_HEADER_CELL
            )}
          >
            Created
          </th>
          <th
            className={cn(
              "hidden px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted md:table-cell",
              stickyHeader && STICKY_HEADER_CELL
            )}
          >
            Category
          </th>
          <th
            className={cn(
              "px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted",
              stickyHeader && STICKY_HEADER_CELL
            )}
          >
            Status
          </th>
          <th
            className={cn(
              "px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted",
              stickyHeader && STICKY_HEADER_CELL
            )}
          >
            Visibility
          </th>
          {isMember && (
            <th
              className={cn(
                "w-12 px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-eyebrow text-ir-muted",
                stickyHeader && STICKY_HEADER_CELL
              )}
            >
              <span className="sr-only">Actions</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-ir-border">
        {posts.map((post) => (
          <PostRow
            categories={categories}
            href={postHref(post)}
            isAdminOrOwner={isAdminOrOwner}
            isMember={isMember}
            isSignedIn={isSignedIn}
            key={post.id}
            mergedIntoHref={mergedIntoHref ? mergedIntoHref(post) : null}
            post={post}
            selectable={selectable}
            showBoardColumn={showBoardColumn}
            workspaceId={workspaceId}
            workspaceStatuses={workspaceStatuses}
          />
        ))}
      </tbody>
    </table>
  );

  // Non-sticky usages (Dashboard, public Profile) keep the original
  // self-contained horizontal-scroll wrapper. stickyHeader usages render the
  // bare table — the caller's own scroll container handles overflow-x itself
  // (see the stickyHeader comment above `tableElement`), so thead's sticky
  // top-0 has nothing but that real ancestor to anchor to.
  const table = stickyHeader ? (
    tableElement
  ) : (
    <div className="overflow-x-auto">{tableElement}</div>
  );

  if (!selectable) {
    return table;
  }

  return (
    <BulkSelectionProvider allIds={posts.map((p) => p.id)}>
      {table}
      <BulkActionBar
        categories={categories}
        posts={posts}
        workspaceId={workspaceId}
        workspaceStatuses={workspaceStatuses}
      />
    </BulkSelectionProvider>
  );
}
