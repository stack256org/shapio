import { redirect } from "next/navigation";
import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { ForgotPasswordForm } from "@/app/(auth)/_components/forgot-password-form";
import { isFeatureEnabled } from "@/lib/orbit/feature-flags";
import { isSmtpConfigured } from "@/lib/smtp/client";

export const metadata = {
  title: "Reset your password",
};

export default async function ForgotPasswordPage() {
  // No dead-end link: this page only makes sense when password sign-up is on
  // AND SMTP can actually deliver the reset email (mirrors the "Forgot
  // password?" link's own visibility condition in the sign-in form).
  const passwordEnabled = await isFeatureEnabled("password_auth");
  if (!(passwordEnabled && isSmtpConfigured())) {
    redirect("/signin");
  }

  return (
    <AuthShell
      subtitle="Enter your email and we'll send you a link to reset it."
      title="Reset your password"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
