import { createElement } from "react";
import { PRODUCT_NAME } from "@/config/platform";
import { OtpEmail } from "@/lib/email/components/otp";
import { renderEmailTemplate } from "@/lib/email/renderer";

export async function otpTemplate({
  email,
  otp,
}: {
  email: string;
  otp: string;
}) {
  const html = await renderEmailTemplate(
    createElement(OtpEmail, { email, otp, productName: PRODUCT_NAME })
  );

  const text = `Sign in to ${PRODUCT_NAME}

Your sign-in code: ${otp}

Enter this code where you started signing in. It expires shortly and can only be used once. If you did not request it, you can ignore this email.`;

  return { html, text };
}
