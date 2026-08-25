import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/authz";

export async function POST() {
  const session = await getCurrentSession();

  if (!session?.session?.impersonatedBy) {
    return NextResponse.json(
      { error: "No active impersonation session" },
      { status: 400 }
    );
  }

  const targetUserId = session.user.id;
  const targetEmail = session.user.email;
  const adminUserId = session.session.impersonatedBy;

  const requestHeaders = await headers();

  type AuthApiMethod = (...args: unknown[]) => Promise<Response>;
  const response = (await (
    auth.api as Record<string, AuthApiMethod>
  ).stopImpersonating({
    headers: requestHeaders,
    asResponse: true,
  })) as unknown as Response;

  await audit({
    action: "impersonation.ended",
    actorId: adminUserId,
    description: `Impersonation of ${targetEmail} ended`,
    entityId: targetUserId,
    entityName: targetEmail,
    entityType: "user",
    workspaceId: null,
  });

  return response;
}
