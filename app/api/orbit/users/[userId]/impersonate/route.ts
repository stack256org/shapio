import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { user } from "@/db/schema";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!env.ENABLE_IMPERSONATION) {
    return NextResponse.json(
      { error: "Impersonation is disabled on this platform" },
      { status: 403 }
    );
  }

  const session = await requireAdmin();
  const { userId } = await params;

  const [targetUser] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const requestHeaders = await headers();

  type AuthApiMethod = (...args: unknown[]) => Promise<Response>;
  const response = (await (
    auth.api as Record<string, AuthApiMethod>
  ).impersonateUser({
    body: { userId },
    headers: requestHeaders,
    asResponse: true,
  })) as unknown as Response;

  await audit({
    action: "impersonation.started",
    actorId: session.user.id,
    actorEmail: session.user.email,
    description: `Admin impersonated user ${targetUser.email}`,
    entityId: userId,
    entityName: targetUser.email,
    entityType: "user",
    workspaceId: null,
  });

  return response;
}
