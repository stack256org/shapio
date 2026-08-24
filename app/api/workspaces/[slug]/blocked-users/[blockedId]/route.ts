import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { unblockUser } from "@/lib/moderation/block";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ slug: string; blockedId: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug, blockedId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await unblockUser(blockedId, workspace.id, session.user.id);
  return NextResponse.json({ ok: true });
}
