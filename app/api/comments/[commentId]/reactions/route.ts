import { type NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/authz";
import { getCommentById } from "@/lib/comments";
import { REACTION_EMOJIS, toggleReaction } from "@/lib/comments/reactions";

interface Params {
  params: Promise<{ commentId: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { commentId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to react." }, { status: 401 });
  }

  let body: { emoji?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }

  const emoji = typeof body.emoji === "string" ? body.emoji : "";
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    return NextResponse.json({ error: "Invalid emoji." }, { status: 422 });
  }

  const comment = await getCommentById(commentId);
  if (!comment || comment.isDeleted) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const result = await toggleReaction(commentId, emoji, session.user.id);
  return NextResponse.json(result);
}
