import { createElement } from "react";
import { PRODUCT_NAME } from "@/config/platform";
import { InviteEmail } from "@/lib/email/components/invite";
import { renderEmailTemplate } from "@/lib/email/renderer";

export async function inviteTemplate({
  inviterName,
  workspaceName,
  role,
  inviteUrl,
}: {
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
}) {
  const html = await renderEmailTemplate(
    createElement(InviteEmail, {
      inviterName,
      workspaceName,
      role,
      inviteUrl,
      productName: PRODUCT_NAME,
    })
  );

  const text = `You've been invited to join ${workspaceName}

${inviterName} has invited you to join ${workspaceName} as a ${role}.

Accept your invitation:
${inviteUrl}

If you were not expecting this invitation, you can safely ignore this email.`;

  return { html, text };
}
