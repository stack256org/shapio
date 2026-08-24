import { getBoardById } from "@/lib/boards/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

/**
 * Whether a post is accessible (readable / participable) to a given user, based
 * on its board's visibility. Public boards are open to anyone; private boards
 * are restricted to workspace members (Brand Admin + Team Member) — mirrors the
 * page-level gate in the public board/post pages (PLATFORM.md §7, Feature 04).
 *
 * Used at the API trust boundary for vote/comment write and comment read so the
 * routes can't be used to reach private-board posts by id.
 */
export async function isPostAccessible(
  post: {
    boardId: string;
    workspaceId: string;
    isDraft?: boolean;
    isApproved?: boolean;
  },
  userId: string | null
): Promise<boolean> {
  const board = await getBoardById(post.boardId);
  if (!board) {
    return false;
  }
  // Unpublished drafts are restricted to workspace members regardless of board
  // visibility — the public must not be able to vote on or comment on them.
  if (post.isDraft) {
    if (!userId) {
      return false;
    }
    const draftMember = await getWorkspaceMember(post.workspaceId, userId);
    return !!draftMember;
  }
  // Hidden/unapproved posts are restricted to workspace members regardless of
  // board visibility — a public board doesn't make a hidden post votable or
  // commentable by the public.
  if (post.isApproved === false) {
    if (!userId) {
      return false;
    }
    const member = await getWorkspaceMember(post.workspaceId, userId);
    return !!member;
  }
  if (board.isPublic) {
    return true;
  }
  if (!userId) {
    return false;
  }
  const member = await getWorkspaceMember(post.workspaceId, userId);
  return !!member;
}
