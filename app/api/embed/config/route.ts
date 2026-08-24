import { type NextRequest, NextResponse } from "next/server";
import { getWidgetHostConfig } from "@/lib/embed/queries";

// Public, cross-origin, unauthenticated — this is the widget.js host-page
// button chrome config (see public/widget.js), fetched from the *installer's*
// site (e.g. acme.com), not from inside this app's own iframe like every
// other app/api/embed/* route. That makes it the one route in this
// namespace that needs an explicit CORS header: a plain GET with no custom
// request headers/credentials is a CORS "simple request", so a response
// header is all that's needed — no OPTIONS preflight handler.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

// Short enough that a save-then-refresh while configuring the widget feels
// immediate, long enough to absorb a page reloading in a tight loop.
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=5, stale-while-revalidate=30",
};

export async function GET(req: NextRequest) {
  const workspaceSlug = req.nextUrl.searchParams.get("workspace");
  if (!workspaceSlug) {
    return NextResponse.json(
      { error: "workspace is required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const config = await getWidgetHostConfig(workspaceSlug);
  if (!config) {
    return NextResponse.json(
      { error: "No embeddable board found for this workspace" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(config, {
    headers: { ...CORS_HEADERS, ...CACHE_HEADERS },
  });
}
