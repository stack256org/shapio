import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/authz";
import { getUnreadCount } from "@/lib/notifications/queries";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ unreadCount: 0 }, { status: 200 });
  }

  const unreadCount = await getUnreadCount(session.user.id);
  return NextResponse.json(
    { unreadCount },
    { headers: { "Cache-Control": "no-store" } }
  );
}
