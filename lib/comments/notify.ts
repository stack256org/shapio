import { and, eq, inArray } from "drizzle-orm";
import { WORKSPACE_ADMIN, WORKSPACE_OWNER } from "@/config/platform";
import { boards, workspaceMembers, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

// Admin/owner only — unlike enqueueNewPostAlerts (which fans out to every
// workspace member), moderating a pending comment is an admin/owner-only
// action, so a plain member would receive an alert they can't act on.
export async function enqueuePendingCommentAlerts(input: {
  commentId: string;
  commentBody: string;
  commenterId: string | null;
  commenterName: string;
  postId: string;
  postTitle: string;
  postSlug: string;
  boardId: string;
  workspaceId: string;
}) {
  const [boardRow] = await db
    .select({ slug: boards.slug, name: boards.name })
    .from(boards)
    .where(eq(boards.id, input.boardId))
    .limit(1);

  const [workspaceRow] = await db
    .select({ slug: workspaces.slug, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .limit(1);

  if (!boardRow || !workspaceRow) {
    return;
  }

  const { user: userTable } = await import("@/db/schema/auth");

  const moderators = await db
    .select({
      userId: workspaceMembers.userId,
      email: userTable.email,
      name: userTable.name,
    })
    .from(workspaceMembers)
    .innerJoin(userTable, eq(workspaceMembers.userId, userTable.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, input.workspaceId),
        inArray(workspaceMembers.role, [WORKSPACE_OWNER, WORKSPACE_ADMIN])
      )
    );

  for (const moderator of moderators) {
    if (moderator.userId === input.commenterId) {
      continue;
    }

    await enqueueJob(JOB_NAMES.SEND_PENDING_COMMENT_ALERT, {
      commentId: input.commentId,
      commentBody: input.commentBody,
      commenterId: input.commenterId,
      commenterName: input.commenterName,
      postId: input.postId,
      postTitle: input.postTitle,
      postSlug: input.postSlug,
      workspaceId: input.workspaceId,
      workspaceSlug: workspaceRow.slug,
      workspaceName: workspaceRow.name,
      boardName: boardRow.name,
      boardSlug: boardRow.slug,
      moderatorEmail: moderator.email,
      moderatorUserId: moderator.userId,
    });
  }
}
