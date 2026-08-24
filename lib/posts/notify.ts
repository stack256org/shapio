import { eq } from "drizzle-orm";
import { boards, workspaceMembers, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

export async function enqueueNewPostAlerts(input: {
  postId: string;
  postTitle: string;
  postBody: string | null;
  postSlug: string;
  boardId: string;
  workspaceId: string;
  // Null when an accountless guest submitted the feedback — the
  // "don't alert the author about their own post" check below simply never
  // matches, which is correct: no admin is that guest.
  authorId: string | null;
  authorName: string;
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

  const admins = await db
    .select({
      userId: workspaceMembers.userId,
      email: userTable.email,
      name: userTable.name,
    })
    .from(workspaceMembers)
    .innerJoin(userTable, eq(workspaceMembers.userId, userTable.id))
    .where(eq(workspaceMembers.workspaceId, input.workspaceId));

  for (const admin of admins) {
    if (admin.userId === input.authorId) {
      continue;
    }

    await enqueueJob(JOB_NAMES.SEND_NEW_POST_ALERT, {
      postId: input.postId,
      postTitle: input.postTitle,
      postBody: input.postBody,
      postSlug: input.postSlug,
      workspaceId: input.workspaceId,
      workspaceSlug: workspaceRow.slug,
      workspaceName: workspaceRow.name,
      boardName: boardRow.name,
      boardSlug: boardRow.slug,
      authorName: input.authorName,
      authorId: input.authorId,
      adminEmail: admin.email,
      adminUserId: admin.userId,
    });
  }
}
