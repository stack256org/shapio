import { type NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/authz";
import {
  clearAllNotifications,
  listNotifications,
  markAllNotificationsAsRead,
} from "@/lib/notifications/queries";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? 30))
  );

  const { items, total, hasMore } = await listNotifications(session.user.id, {
    page,
    limit,
  });

  return NextResponse.json(
    { notifications: items, total, hasMore },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function PATCH(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let workspaceId: string | undefined;
  try {
    const body = await req.json();
    workspaceId = body.workspaceId ?? undefined;
  } catch {
    // no body is fine
  }

  const count = await markAllNotificationsAsRead(session.user.id, workspaceId);
  return NextResponse.json({ count });
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let workspaceId: string | undefined;
  try {
    const body = await req.json();
    workspaceId = body.workspaceId ?? undefined;
  } catch {
    // no body is fine
  }

  const count = await clearAllNotifications(session.user.id, workspaceId);
  return NextResponse.json({ count });
}
