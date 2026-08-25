import { PRODUCT_NAME } from "@/config/platform";
import { commentPreviewText } from "@/lib/comments/preview";

export function pendingCommentAlertEmailTemplate({
  commenterName,
  commentBody,
  postTitle,
  reviewUrl,
  boardName,
  workspaceName,
}: {
  commenterName: string;
  commentBody: string;
  postTitle: string;
  reviewUrl: string;
  boardName: string;
  workspaceName: string;
}) {
  const subject = `Comment awaiting approval on "${postTitle}"`;
  const preview = commentPreviewText(commentBody, 200);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;max-width:600px;width:100%;">
      <tr><td style="padding:32px 40px 0;">
        <p style="margin:0;font-size:13px;color:#6b7280;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">${workspaceName} · ${boardName}</p>
        <h1 style="margin:12px 0 0;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">Comment awaiting approval</h1>
      </td></tr>
      <tr><td style="padding:24px 40px;">
        <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">From <strong style="color:#374151;">${commenterName}</strong> on <strong style="color:#374151;">${postTitle}</strong></p>
        <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6;border-left:3px solid #e5e7eb;padding-left:12px;">${preview}</p>
        <div style="margin-top:24px;">
          <a href="${reviewUrl}" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Review comment →</a>
        </div>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid #f3f4f6;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this as an admin of <strong>${workspaceName}</strong>. Sent by ${PRODUCT_NAME}.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = `${workspaceName} · ${boardName}: Comment awaiting approval

${commenterName} commented on "${postTitle}"

${preview}

Review comment: ${reviewUrl}

You're receiving this as an admin of ${workspaceName}.`;

  return { subject, html, text };
}
