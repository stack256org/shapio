import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { changelogEntries } from "@/db/schema";
import { getCurrentSession } from "@/lib/authz";
import {
  ChangelogCommentBlockedError,
  ChangelogCommentNotFoundError,
  createChangelogComment,
} from "@/lib/changelog-comments/create";
import { listChangelogCommentsWithReplies } from "@/lib/changelog-comments/queries";
import { db } from "@/lib/db";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ entryId: string }>;
}

// Shape a comment/reply row into the payload the shared comment components
// expect. `postId` mirrors the entry id so the reused CommentData shape is
// satisfied — the components use it only for the default (feedback) endpoint,
// which the changelog `api` config overrides.
function sanitize(
  c: {
    id: string;
    changelogEntryId: string;
    parentId: string | null;
    body: string;
    isDeleted: boolean;
    isApproved: boolean;
    authorId: string | null;
    authorName: string | null;
    authorAvatar: string | null;
    createdAt: Date;
  },
  currentUserId: string | null
) {
  return {
    id: c.id,
    postId: c.changelogEntryId,
    changelogEntryId: c.changelogEntryId,
    parentId: c.parentId,
    body: c.body,
    isDeleted: c.isDeleted,
    isApproved: c.isApproved,
    authorName: c.isDeleted ? null : c.authorName,
    authorAvatar: c.isDeleted ? null : c.authorAvatar,
    isGuest: !c.authorId,
    isOwn: !!currentUserId && c.authorId === currentUserId,
    createdAt: c.createdAt,
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  const { entryId } = await params;
  const session = await getCurrentSession();

  const [entry] = await db
    .select({
      workspaceId: changelogEntries.workspaceId,
      isPublished: changelogEntries.isPublished,
    })
    .from(changelogEntries)
    .where(eq(changelogEntries.id, entryId))
    .limit(1);

  if (!entry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const member = session
    ? await getWorkspaceMember(entry.workspaceId, session.user.id)
    : null;
  const isMember = !!member;
  const canModerate = !!member && member.role !== WORKSPACE_MEMBER;

  if (!entry.isPublished && !isMember) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const includeUnapproved =
    canModerate && req.nextUrl.searchParams.get("includeUnapproved") === "true";

  const threaded = await listChangelogCommentsWithReplies(entryId, {
    includeUnapproved,
  });
  const uid = session?.user.id ?? null;

  return NextResponse.json(
    threaded.map((c) => ({
      ...sanitize(c, uid),
      replies: c.replies.map((r) => sanitize(r, uid)),
    }))
  );
}

export async function POST(req: NextRequest, { params }: Params) {
  const { entryId } = await params;
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sign in to comment." }, { status: 401 });
  }

  let body: { body?: string; parentId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!rawBody || rawBody.length < 1 || rawBody.length > 5000) {
    return NextResponse.json(
      { error: "Comment must be between 1 and 5000 characters." },
      { status: 422 }
    );
  }

  const [entry] = await db
    .select({
      workspaceId: changelogEntries.workspaceId,
      isPublished: changelogEntries.isPublished,
    })
    .from(changelogEntries)
    .where(eq(changelogEntries.id, entryId))
    .limit(1);

  if (!entry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  // Unpublished (draft) entries accept comments only from workspace members
  // (the admin editor); the public never sees drafts.
  const isMember = !!(await getWorkspaceMember(
    entry.workspaceId,
    session.user.id
  ));
  if (!entry.isPublished && !isMember) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  try {
    const comment = await createChangelogComment(
      entryId,
      {
        body: rawBody,
        parentId: body.parentId ?? null,
        authorId: session.user.id,
      },
      entry.workspaceId,
      { allowUnpublished: isMember }
    );

    return NextResponse.json(
      {
        id: comment.id,
        postId: comment.changelogEntryId,
        changelogEntryId: comment.changelogEntryId,
        parentId: comment.parentId,
        body: comment.body,
        isApproved: comment.isApproved,
        isDeleted: false,
        authorName: comment.authorName,
        authorAvatar: comment.authorAvatar,
        isGuest: false,
        isOwn: true,
        createdAt: comment.createdAt,
      },
      { status: 201 }
    );
  } catch (err) {
    if (
      err instanceof ChangelogCommentNotFoundError ||
      err instanceof ChangelogCommentBlockedError
    ) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[POST /api/changelog/[entryId]/comments]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
