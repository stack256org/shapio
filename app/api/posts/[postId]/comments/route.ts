import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import {
  CommentBlockedError,
  CommentNotFoundError,
  createComment,
  listComments,
} from "@/lib/comments";
import { getPortalActor } from "@/lib/portal/guest-identity";
import { isPostAccessible } from "@/lib/posts/access";
import { getPost } from "@/lib/posts/queries";
import { countCharacters } from "@/lib/text-metrics";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ postId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { postId } = await params;
  const session = await getCurrentSession();

  const post = await getPost(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  // Comments on private-board posts are visible only to workspace members.
  if (!(await isPostAccessible(post, session?.user.id ?? null))) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const isAdmin =
    session &&
    (await getWorkspaceMember(post.workspaceId, session.user.id).then(
      (m) => m && m.role !== WORKSPACE_MEMBER
    ));

  const includeUnapprovedParam =
    req.nextUrl.searchParams.get("includeUnapproved") === "true";
  const includeUnapproved = !!(isAdmin && includeUnapprovedParam);

  const threadedComments = await listComments(postId, { includeUnapproved });

  // Sanitize: never return author_email
  const sanitized = threadedComments.map((c) => ({
    id: c.id,
    postId: c.postId,
    parentId: c.parentId,
    body: c.body,
    isDeleted: c.isDeleted,
    isApproved: c.isApproved,
    authorName: c.isDeleted ? null : c.authorName,
    authorAvatar: c.isDeleted ? null : c.authorAvatar,
    isGuest: !c.authorId,
    // Whether this comment belongs to the current viewer — drives the Edit
    // affordance without ever exposing author ids.
    isOwn: !!session && c.authorId === session.user.id,
    createdAt: c.createdAt,
    replies: c.replies.map((r) => ({
      id: r.id,
      postId: r.postId,
      parentId: r.parentId,
      body: r.body,
      isDeleted: r.isDeleted,
      isApproved: r.isApproved,
      authorName: r.isDeleted ? null : r.authorName,
      authorAvatar: r.isDeleted ? null : r.authorAvatar,
      isGuest: !r.authorId,
      isOwn: !!session && r.authorId === session.user.id,
      createdAt: r.createdAt,
    })),
  }));

  return NextResponse.json(sanitized);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { postId } = await params;
  // A signed-in account OR an accountless Public Portal visitor who has
  // verified their email. `actor.id` is null in the latter case.
  const actor = await getPortalActor();

  if (!actor) {
    return NextResponse.json(
      { error: "Verify your email to comment." },
      { status: 401 }
    );
  }

  let body: {
    body?: string;
    parentId?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Validate body
  const rawBody = typeof body.body === "string" ? body.body.trim() : "";
  const bodyLength = countCharacters(rawBody);
  if (bodyLength < 1 || bodyLength > 5000) {
    return NextResponse.json(
      { error: "Comment must be between 1 and 5000 characters." },
      { status: 422 }
    );
  }

  const post = await getPost(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  // Private-board posts accept comments only from workspace members. A guest
  // passes null here, which correctly fails for private, draft, and unapproved
  // posts — accountless participation is confined to public, published ones.
  if (!(await isPostAccessible(post, actor.id))) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  try {
    const comment = await createComment(
      postId,
      {
        body: rawBody,
        parentId: body.parentId ?? null,
        authorId: actor.id,
        authorEmail: actor.email,
        authorName: actor.name,
        authorAvatar: null,
      },
      post.workspaceId
    );

    return NextResponse.json(
      {
        id: comment.id,
        postId: comment.postId,
        parentId: comment.parentId,
        body: comment.body,
        isApproved: comment.isApproved,
        isDeleted: false,
        authorName: comment.authorName,
        authorAvatar: comment.authorAvatar,
        isGuest: !actor.id,
        // Guest comments are final: no edit/delete affordance is offered, and
        // the server refuses both (see lib/comments/update.ts, delete.ts).
        isOwn: !!actor.id,
        createdAt: comment.createdAt,
      },
      { status: 201 }
    );
  } catch (err) {
    if (
      err instanceof CommentNotFoundError ||
      err instanceof CommentBlockedError
    ) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[POST /api/posts/[postId]/comments]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
