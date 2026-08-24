import { type NextRequest, NextResponse } from "next/server";
import { getBoardById } from "@/lib/boards/queries";
import { searchSimilarPosts } from "@/lib/posts/queries";

// Unauthenticated on purpose — unlike /api/embed/posts (creates a post,
// needs an identity), this only searches the same public board listing an
// anonymous visitor can already see at /{workspace}/b/{board}. There's
// nothing here a signed-out visitor couldn't already read.
export async function GET(req: NextRequest) {
  const boardId = req.nextUrl.searchParams.get("boardId");
  const query = req.nextUrl.searchParams.get("q") ?? "";

  if (!boardId) {
    return NextResponse.json({ error: "boardId is required" }, { status: 400 });
  }

  const board = await getBoardById(boardId);
  if (!board?.isPublic) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const results = await searchSimilarPosts(boardId, query);
  return NextResponse.json({ posts: results });
}
