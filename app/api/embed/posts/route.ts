import { type NextRequest, NextResponse } from "next/server";
import { getPortalActor } from "@/lib/portal/guest-identity";
import { submitFeedback } from "@/lib/posts/submit-feedback";

// Header-authenticated equivalent of createPostAction (app/actions/posts.ts)
// for the embed widget, whose iframe can't attach a header to a Server Action
// invocation. Same business logic (lib/posts/submit-feedback.ts) — this route
// exists only because the auth header needs a route to land on, not because
// the logic differs.
//
// The widget is a PUBLIC feedback surface, so the usual actor here is an
// accountless visitor who verified their email (actor.id is null), carried on
// X-Portal-Guest. A workspace member testing their own widget still posts as
// their account: getPortalActor prefers a real session over the guest token.
export async function POST(req: NextRequest) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Verify your email to post feedback." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const result = await submitFeedback(actor, body);

  if (!result.ok) {
    const status = result.code === "BLOCKED" ? 403 : 400;
    return NextResponse.json(
      { error: result.error, field: result.field },
      { status }
    );
  }

  return NextResponse.json(
    {
      postId: result.data.postId,
      postSlug: result.data.postSlug,
      isPending: result.data.isPending,
      isDraft: result.data.isDraft,
    },
    { status: 201 }
  );
}
