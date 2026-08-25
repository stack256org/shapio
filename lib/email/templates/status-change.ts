import { PRODUCT_NAME } from "@/config/platform";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
};

function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function statusChangeEmailTemplate({
  recipientName,
  recipientEmail: _recipientEmail,
  postTitle,
  postUrl,
  fromStatus,
  toStatus,
  workspaceName,
  unsubscribeUrl,
}: {
  recipientName: string;
  recipientEmail: string;
  postTitle: string;
  postUrl: string;
  fromStatus: string;
  toStatus: string;
  workspaceName: string;
  unsubscribeUrl?: string | null;
}) {
  const fromLabel = formatStatus(fromStatus);
  const toLabel = formatStatus(toStatus);
  const subject = `Status update: "${postTitle}" is now ${toLabel}`;
  const unsubscribeHtml = unsubscribeUrl
    ? ` <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>.`
    : "";
  const unsubscribeText = unsubscribeUrl
    ? `\n\nUnsubscribe: ${unsubscribeUrl}`
    : "";

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
        <p style="margin:0;font-size:13px;color:#6b7280;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">${workspaceName}</p>
        <h1 style="margin:12px 0 0;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">Status update on a post you voted for</h1>
      </td></tr>
      <tr><td style="padding:24px 40px;">
        <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
          Hi ${recipientName},
        </p>
        <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
          The status of <strong>"${postTitle}"</strong> has been updated.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e5e7eb;width:100%;">
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-right:1px solid #e5e7eb;width:50%;">
              <span style="display:block;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;margin-bottom:4px;">From</span>
              ${fromLabel}
            </td>
            <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:600;width:50%;">
              <span style="display:block;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;margin-bottom:4px;">To</span>
              ${toLabel}
            </td>
          </tr>
        </table>
        <a href="${postUrl}" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">View post →</a>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid #f3f4f6;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you voted on a post in <strong>${workspaceName}</strong>. Sent by ${PRODUCT_NAME}.${unsubscribeHtml}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = `${workspaceName}: Status update on "${postTitle}"

Hi ${recipientName},

The status of "${postTitle}" in ${workspaceName} has been updated from ${fromLabel} to ${toLabel}.

View the post: ${postUrl}

You're receiving this because you voted on this post.${unsubscribeText}`;

  return { subject, html, text };
}
