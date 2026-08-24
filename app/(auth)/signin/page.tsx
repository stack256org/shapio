import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { googleOAuthEnabled } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/orbit/feature-flags";
import { redirectToSetupIfNeeded } from "@/lib/setup";
import { isSmtpConfigured } from "@/lib/smtp/client";

export const metadata = {
  title: "Get started",
};

export default async function LoginPage() {
  // A brand-new self-hosted instance has no users yet — send visitors to the
  // first-run setup wizard instead of a sign-in form nobody can use yet.
  await redirectToSetupIfNeeded();

  // Google sign-in requires both OAuth credentials AND the platform-wide
  // `google_auth` feature flag (an Orbit Admin can disable it without a deploy).
  // `googleOAuthEnabled` (lib/auth.ts) reflects exactly what's wired into the
  // running auth singleton — see the restart-required note there — rather than
  // re-reading Integrations settings independently, which could disagree with
  // what socialProviders actually has active until the next restart.
  const googleEnabled =
    googleOAuthEnabled && (await isFeatureEnabled("google_auth"));

  // Self-serve email + password is off by default — an Orbit Admin opts in at
  // /orbit/feature-flags. "Forgot password?" only makes sense when SMTP can
  // actually deliver the reset email.
  const passwordEnabled = await isFeatureEnabled("password_auth");
  const passwordResetEnabled = passwordEnabled && (await isSmtpConfigured());

  return (
    <AuthForm
      googleEnabled={googleEnabled}
      passwordEnabled={passwordEnabled}
      passwordResetEnabled={passwordResetEnabled}
    />
  );
}
