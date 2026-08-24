import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/orbit/feature-flags";

/** Public — tells the embed widget's in-place sign-in panel whether to offer Google. */
export async function GET() {
  const googleConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const googleEnabled =
    googleConfigured && (await isFeatureEnabled("google_auth"));
  return NextResponse.json({ googleEnabled });
}
