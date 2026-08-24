import { type NextRequest, NextResponse } from "next/server";
import { PRODUCT_NAME } from "@/config/platform";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";
import { upsertNotificationPreferences } from "@/lib/notifications/queries";

function page(title: string, message: string, status: number): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title} — ${PRODUCT_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:Geist,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:64px 20px;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #ded8cc;border-radius:10px;max-width:480px;width:100%;">
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 16px;font-weight:900;color:#171717;">${PRODUCT_NAME}</p>
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">${title}</h1>
        <p style="margin:0;font-size:14px;color:#2c2a26;line-height:1.6;">${message}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function unsubscribe(token: string | null): Promise<NextResponse> {
  const userId = token ? verifyUnsubscribeToken(token) : null;

  if (!userId) {
    return page(
      "Invalid unsubscribe link",
      "This unsubscribe link is invalid or has expired. You can manage your email preferences from your account settings.",
      400
    );
  }

  // Turn off every email notification category for this user. In-app
  // notifications are unaffected and can still be managed from settings.
  await upsertNotificationPreferences(userId, {
    emailStatusChange: false,
    emailNewComment: false,
    emailChangelog: false,
  });

  return page(
    "You've been unsubscribed",
    "You will no longer receive email notifications. You can re-enable them at any time from your notification preferences.",
    200
  );
}

export async function GET(req: NextRequest) {
  return unsubscribe(req.nextUrl.searchParams.get("token"));
}

// Supports RFC 8058 one-click unsubscribe (List-Unsubscribe-Post) for mail
// clients that POST the link rather than navigating to it.
export async function POST(req: NextRequest) {
  return unsubscribe(req.nextUrl.searchParams.get("token"));
}
