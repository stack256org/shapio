import { type NextRequest, NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/orbit/feature-flags";
import { sendGuestOtp, sendOtpSchema } from "@/lib/portal/verification";

/**
 * Public — requests a one-time code so an accountless Public Portal visitor can
 * prove they control an email address. Creates no user and no session.
 */
export async function POST(req: NextRequest) {
  if (!(await isFeatureEnabled("guest_voting"))) {
    return NextResponse.json(
      { error: "Sign in to continue." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = sendOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Enter a valid email address.",
        field: "email",
      },
      { status: 400 }
    );
  }

  try {
    const result = await sendGuestOtp(parsed.data.email, {
      ip:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip"),
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, retryAfterSeconds: result.retryAfterSeconds },
        {
          status: 429,
          headers: result.retryAfterSeconds
            ? { "Retry-After": String(result.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/portal/otp/send]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
