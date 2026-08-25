import { NextResponse } from "next/server";
import { clearGuestIdentity } from "@/lib/portal/guest-identity";

/**
 * Public — forgets the verified guest identity on this browser ("Not you?").
 * Signed-in accounts are untouched; this only drops the guest cookie.
 */
export async function DELETE() {
  await clearGuestIdentity();
  return new NextResponse(null, { status: 204 });
}
