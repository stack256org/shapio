import { eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { comments, posts } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getCurrentSession } from "@/lib/authz";
import { getCommentById, sendCommentNotifications } from "@/lib/comments";
import { db } from "@/lib/db";
import { getPost } from "@/lib/posts/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ commentId: string }>;
}

export async function PATCH(_req: NextRequest, { params }: Params) {
  const { commentId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const comment = await getCommentById(commentId);
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  if (comment.isApproved) {
    return NextResponse.json(
      { error: "Comment is already approved." },
      { status: 409 }
    );
  }

  const post = await getPost(comment.postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const member = await getWorkspaceMember(post.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(comments)
      .set({ isApproved: true, updatedAt: new Date() })
      .where(eq(comments.id, commentId));

    await tx
      .update(posts)
      .set({ commentCount: sql`${posts.commentCount} + 1` })
      .where(eq(posts.id, comment.postId));
  });

  // Send notifications after approval
  sendCommentNotifications(comment, post, true).catch((err) =>
    console.error("[approve] notification error", err)
  );

  audit({
    action: "comment.approved",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: comment.postId,
    description: "Approved comment",
    metadata: { commentId, workspaceId: post.workspaceId },
  });

  return NextResponse.json({ ...comment, isApproved: true });
}
