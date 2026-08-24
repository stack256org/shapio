import { type NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/authz";
import { updatePreferences } from "@/lib/notifications/update-preferences";

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: "Your session has expired. Please sign in again." },
      { status: 401 }
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await updatePreferences(session.user.id, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
