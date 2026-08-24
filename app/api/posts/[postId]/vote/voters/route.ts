import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { getPost } from "@/lib/posts/queries";
import { listVoters } from "@/lib/voting";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ postId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { postId } = await params;
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const post = await getPost(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const member = await getWorkspaceMember(post.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const page = Number.parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const limit = Math.min(
    Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10),
    50
  );

  const { voters, total } = await listVoters(postId, { page, limit });

  return NextResponse.json({ voters, total });
}
