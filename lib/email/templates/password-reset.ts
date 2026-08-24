import { createElement } from "react";
import { PRODUCT_NAME } from "@/config/platform";
import { PasswordResetEmail } from "@/lib/email/components/password-reset";
import { renderEmailTemplate } from "@/lib/email/renderer";

export async function passwordResetTemplate({
  email,
  resetUrl,
}: {
  email: string;
  resetUrl: string;
}) {
  const html = await renderEmailTemplate(
    createElement(PasswordResetEmail, {
      email,
      resetUrl,
      productName: PRODUCT_NAME,
    })
  );

  const text = `Reset your ${PRODUCT_NAME} password

We received a request to reset the password for ${email}. Use this link to choose a new one:
${resetUrl}

If you did not request a password reset, you can ignore this email.`;

  return { html, text };
}
