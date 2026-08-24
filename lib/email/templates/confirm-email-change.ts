import { createElement } from "react";
import { PRODUCT_NAME } from "@/config/platform";
import { ConfirmEmailChangeEmail } from "@/lib/email/components/confirm-email-change";
import { renderEmailTemplate } from "@/lib/email/renderer";

export async function confirmEmailChangeTemplate({
  newEmail,
  confirmUrl,
}: {
  confirmUrl: string;
  newEmail: string;
}) {
  const html = await renderEmailTemplate(
    createElement(ConfirmEmailChangeEmail, {
      newEmail,
      confirmUrl,
      productName: PRODUCT_NAME,
    })
  );

  const text = `Confirm your new email address for ${PRODUCT_NAME}

You requested to change your account email to ${newEmail}. Use this link to confirm:
${confirmUrl}

This link expires in 1 hour. If you did not request this change, you can ignore this email — your account email will not change.`;

  return { html, text };
}
