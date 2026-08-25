import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { changelogComments, changelogEntries } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getCurrentSession } from "@/lib/authz";
import { getChangelogCommentById } from "@/lib/changelog-comments/queries";
import { db } from "@/lib/db";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ commentId: string }>;
}

// Approve a pending changelog comment — admins/owners only.
export async function PATCH(_req: NextRequest, { params }: Params) {
  const { commentId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const comment = await getChangelogCommentById(commentId);
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }
  if (comment.isApproved) {
    return NextResponse.json(
      { error: "Comment is already approved." },
      { status: 409 }
    );
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
  if (!member || member.role === WORKSPACE_MEMBER) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await db
    .update(changelogComments)
    .set({ isApproved: true })
    .where(eq(changelogComments.id, commentId));

  audit({
    action: "changelog_comment.approved",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "changelog_entry",
    entityId: comment.changelogEntryId,
    description: "Approved changelog comment",
    metadata: { commentId, workspaceId: entry.workspaceId },
  });

  return NextResponse.json({ ...comment, isApproved: true });
}
