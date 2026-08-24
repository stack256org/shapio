import { type NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { getPortalActor } from "@/lib/portal/guest-identity";
import { isPostAccessible } from "@/lib/posts/access";
import { getPost } from "@/lib/posts/queries";
import {
  castVote,
  removeVote,
  type VoteActor,
  VoteBlockedError,
  VoteNotFoundError,
} from "@/lib/voting";

interface Params {
  params: Promise<{ postId: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { postId } = await params;
  // A signed-in account OR an accountless Public Portal visitor who has
  // verified their email — `actor.id` is null for the latter.
  const actor = await getPortalActor();

  if (!actor) {
    return NextResponse.json(
      { error: "Verify your email to vote." },
      { status: 401 }
    );
  }

  // Get post to find workspaceId
  const post = await getPost(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  // Private-board posts are reachable only by workspace members. A guest
  // passes null, which correctly fails for private, draft, and unapproved
  // posts — accountless voting is confined to public, published ones.
  if (!(await isPostAccessible(post, actor.id))) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  try {
    const voter: VoteActor = {
      userEmail: actor.email,
      userId: actor.id,
      userName: actor.name,
    };

    const existingVote = await import("@/lib/voting/list").then((m) =>
      m.hasUserVoted(postId, {
        userId: actor.id ?? undefined,
        userEmail: actor.id ? undefined : actor.email,
      })
    );

    const vote = await castVote(postId, post.workspaceId, voter);

    audit({
      action: "vote.created",
      actorId: actor.id,
      actorEmail: actor.email,
      entityType: "post",
      entityId: postId,
      description: `Voted on: ${post.title}`,
      metadata: { workspaceId: post.workspaceId, isGuest: !actor.id },
    });

    // Refetch updated vote count
    const updated = await getPost(postId);
    const voteCount = updated?.upvotes ?? post.upvotes;

    const status = existingVote ? 200 : 201;
    return NextResponse.json({ voteId: vote?.id, voteCount }, { status });
  } catch (err) {
    if (err instanceof VoteNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof VoteBlockedError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[POST /api/posts/[postId]/vote]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { postId } = await params;
  const actor = await getPortalActor();

  if (!actor) {
    return NextResponse.json(
      { error: "Verify your email to manage your vote." },
      { status: 401 }
    );
  }

  const post = await getPost(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  // Private-board posts are reachable only by workspace members.
  if (!(await isPostAccessible(post, actor.id))) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  await removeVote(postId, { userEmail: actor.email, userId: actor.id });

  audit({
    action: "vote.removed",
    actorId: actor.id,
    actorEmail: actor.email,
    entityType: "post",
    entityId: postId,
    description: `Removed vote from: ${post.title}`,
    metadata: { workspaceId: post.workspaceId, isGuest: !actor.id },
  });

  return new NextResponse(null, { status: 204 });
}
