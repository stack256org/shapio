import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { listAuditLogs } from "@/lib/audit/queries";
import { getCurrentSession } from "@/lib/authz";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;

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

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") ?? 50))
  );
  const action = searchParams.get("action") ?? undefined;
  const entityType = searchParams.get("entityType") ?? undefined;
  const actorId = searchParams.get("actorId") ?? undefined;

  const result = await listAuditLogs(workspace.id, {
    page,
    limit,
    action,
    entityType,
    actorId,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
