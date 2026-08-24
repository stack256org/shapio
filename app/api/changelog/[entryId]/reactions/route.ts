import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { changelogEntries } from "@/db/schema";
import { getCurrentSession } from "@/lib/authz";
import {
  REACTION_EMOJIS,
  toggleEntryReaction,
} from "@/lib/changelog-comments/reactions";
import { db } from "@/lib/db";

interface Params {
  params: Promise<{ entryId: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { entryId } = await params;

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

  const [entry] = await db
    .select({ isPublished: changelogEntries.isPublished })
    .from(changelogEntries)
    .where(eq(changelogEntries.id, entryId))
    .limit(1);

  if (!entry?.isPublished) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const result = await toggleEntryReaction(entryId, emoji, session.user.id);
  return NextResponse.json(result);
}
