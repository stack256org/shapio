import { PRODUCT_NAME } from "@/config/platform";
import { truncateHtmlToText } from "@/lib/changelog/html";

export function newPostAlertEmailTemplate({
  adminName: _adminName,
  authorName,
  postTitle,
  postBody,
  postUrl,
  boardName,
  workspaceName,
}: {
  adminName: string;
  authorName: string;
  postTitle: string;
  postBody: string | null;
  postUrl: string;
  boardName: string;
  workspaceName: string;
}) {
  const subject = `New post on ${boardName}: "${postTitle}"`;
  // postBody may be Quill HTML — strip tags for the plain-text email preview.
  const preview = postBody ? truncateHtmlToText(postBody, 200) : null;

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
        <h1 style="margin:12px 0 0;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">New post submitted</h1>
      </td></tr>
      <tr><td style="padding:24px 40px;">
        <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">From <strong style="color:#374151;">${authorName}</strong></p>
        <h2 style="margin:12px 0 0;font-size:16px;font-weight:600;color:#111827;">${postTitle}</h2>
        ${preview ? `<p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6;border-left:3px solid #e5e7eb;padding-left:12px;">${preview}</p>` : ""}
        <div style="margin-top:24px;">
          <a href="${postUrl}" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">View post →</a>
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

  const text = `${workspaceName} · ${boardName}: New post

New post by ${authorName}: "${postTitle}"

${preview ? `${preview}\n\n` : ""}View post: ${postUrl}

You're receiving this as an admin of ${workspaceName}.`;

  return { subject, html, text };
}
