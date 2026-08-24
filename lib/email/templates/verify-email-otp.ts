import { createElement } from "react";
import { PRODUCT_NAME } from "@/config/platform";
import { VerifyEmailOtpEmail } from "@/lib/email/components/verify-email-otp";
import { renderEmailTemplate } from "@/lib/email/renderer";

export async function verifyEmailOtpTemplate({
  email,
  otp,
  workspaceName,
}: {
  email: string;
  otp: string;
  workspaceName?: string;
}) {
  const html = await renderEmailTemplate(
    createElement(VerifyEmailOtpEmail, {
      email,
      otp,
      productName: PRODUCT_NAME,
      workspaceName,
    })
  );

  const destination = workspaceName ?? PRODUCT_NAME;

  const text = `Verify your email

Your verification code: ${otp}

Enter this code to confirm ${email} and post your feedback to ${destination}. It expires shortly and can only be used once. No account is created — this only confirms the address. If you did not request it, you can ignore this email.`;

  return { html, text };
}
