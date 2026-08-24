import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { audit } from "@/lib/audit";
import { getCurrentSession } from "@/lib/authz";
import {
  CommentDeleteError,
  CommentUpdateError,
  deleteComment,
  getCommentById,
  updateComment,
} from "@/lib/comments";
import { isPostAccessible } from "@/lib/posts/access";
import { getPost } from "@/lib/posts/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ commentId: string }>;
}

// Edit a comment's body — author only.
export async function PATCH(req: NextRequest, { params }: Params) {
  const { commentId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: { body?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const rawBody = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!rawBody || rawBody.length < 1 || rawBody.length > 5000) {
    return NextResponse.json(
      { error: "Comment must be between 1 and 5000 characters." },
      { status: 422 }
    );
  }

  const comment = await getCommentById(commentId);
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const post = await getPost(comment.postId);
  // Same visibility gate as posting — a private-board post is editable only by
  // those who can access it.
  if (!post || !(await isPostAccessible(post, session.user.id))) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (comment.authorId !== session.user.id) {
    return NextResponse.json(
      { error: "You can only edit your own comment." },
      { status: 403 }
    );
  }

  try {
    await updateComment(commentId, session.user.id, rawBody);
  } catch (err) {
    if (err instanceof CommentUpdateError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[PATCH /api/comments/[commentId]]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }

  audit({
    action: "comment.updated",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: comment.postId,
    description: "Edited comment",
    metadata: { commentId, workspaceId: post.workspaceId },
  });

  return NextResponse.json({ id: commentId, body: rawBody });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { commentId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const comment = await getCommentById(commentId);
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const post = await getPost(comment.postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  // A comment's author may delete their own comment even if they are not a
  // workspace member (a public User who commented). Non-authors must be members.
  const member = await getWorkspaceMember(post.workspaceId, session.user.id);
  const isAuthor = comment.authorId === session.user.id;
  if (!member && !isAuthor) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    // Non-member authors act with plain (member-level) privileges; deleteComment
    // still verifies authorship, so they can only remove their own comment.
    await deleteComment(
      commentId,
      session.user.id,
      member?.role ?? WORKSPACE_MEMBER
    );
  } catch (err) {
    if (err instanceof CommentDeleteError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[DELETE /api/comments/[commentId]]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }

  audit({
    action: "comment.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: comment.postId,
    description: "Deleted comment",
    metadata: { commentId, workspaceId: post.workspaceId },
  });

  return new NextResponse(null, { status: 204 });
}
