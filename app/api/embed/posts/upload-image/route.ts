import { type NextRequest, NextResponse } from "next/server";
import { getPortalActor } from "@/lib/portal/guest-identity";
import { guestUploadKey, uploadPostImage } from "@/lib/posts/upload-image";

// Header-authenticated equivalent of uploadPostImageAction
// (app/actions/posts.ts) for the embed widget — see app/api/embed/posts
// for why this exists as a Route Handler rather than reusing the action.
export async function POST(req: NextRequest) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Verify your email to attach an image." },
      { status: 401 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("image");
  const result = await uploadPostImage(
    // A guest has no id; the derived key keeps their uploads grouped without
    // putting their email in a publicly readable image URL.
    actor.id ?? guestUploadKey(actor.email),
    file instanceof File ? file : null
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data, { status: 200 });
}
