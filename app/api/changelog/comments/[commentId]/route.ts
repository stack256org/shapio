import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { changelogEntries } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getCurrentSession } from "@/lib/authz";
import {
  ChangelogCommentDeleteError,
  deleteChangelogComment,
} from "@/lib/changelog-comments/delete";
import { getChangelogCommentById } from "@/lib/changelog-comments/queries";
import {
  ChangelogCommentUpdateError,
  updateChangelogComment,
} from "@/lib/changelog-comments/update";
import { db } from "@/lib/db";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ commentId: string }>;
}

// Edit a comment's body — author only (enforced by updateChangelogComment).
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

  const comment = await getChangelogCommentById(commentId);
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const [entry] = await db
    .select({ workspaceId: changelogEntries.workspaceId })
    .from(changelogEntries)
    .where(eq(changelogEntries.id, comment.changelogEntryId))
    .limit(1);

  if (!entry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  if (comment.authorId !== session.user.id) {
    return NextResponse.json(
      { error: "You can only edit your own comment." },
      { status: 403 }
    );
  }

  try {
    await updateChangelogComment(commentId, session.user.id, rawBody);
  } catch (err) {
    if (err instanceof ChangelogCommentUpdateError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[PATCH /api/changelog/comments/[commentId]]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }

  audit({
    action: "changelog_comment.updated",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "changelog_entry",
    entityId: comment.changelogEntryId,
    description: "Edited changelog comment",
    metadata: { commentId, workspaceId: entry.workspaceId },
  });

  return NextResponse.json({ id: commentId, body: rawBody });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { commentId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const comment = await getChangelogCommentById(commentId);
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const [entry] = await db
    .select({ workspaceId: changelogEntries.workspaceId })
    .from(changelogEntries)
    .where(eq(changelogEntries.id, comment.changelogEntryId))
    .limit(1);

  if (!entry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const member = await getWorkspaceMember(entry.workspaceId, session.user.id);
  const isAuthor = comment.authorId === session.user.id;
  if (!member && !isAuthor) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    await deleteChangelogComment(
      commentId,
      session.user.id,
      member?.role ?? WORKSPACE_MEMBER
    );
  } catch (err) {
    if (err instanceof ChangelogCommentDeleteError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[DELETE /api/changelog/comments/[commentId]]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }

  audit({
    action: "changelog_comment.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "changelog_entry",
    entityId: comment.changelogEntryId,
    description: "Deleted changelog comment",
    metadata: { commentId, workspaceId: entry.workspaceId },
  });

  return new NextResponse(null, { status: 204 });
}
