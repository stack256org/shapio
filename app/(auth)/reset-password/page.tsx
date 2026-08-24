import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { ResetPasswordForm } from "@/app/(auth)/_components/reset-password-form";

export const metadata = {
  title: "Set a new password",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <AuthShell
      subtitle={
        token
          ? "Choose a new password for your account."
          : "This password reset link is invalid or has expired."
      }
      title="Set a new password"
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="rounded-ir-sm bg-ir-danger/10 p-3 text-sm text-ir-danger">
          Please request a new reset link from the{" "}
          <a className="underline hover:no-underline" href="/forgot-password">
            forgot password
          </a>{" "}
          page.
        </p>
      )}
    </AuthShell>
  );
}
