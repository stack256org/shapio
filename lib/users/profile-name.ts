// Better Auth has no name-collection step for magic-link sign-in (the
// dominant sign-up path — see app/(auth)/_components/auth-form.tsx), so it
// defaults a brand-new user's name to something derived from their email.
// Google sign-ins DO get a real name from the OAuth profile. Treat anything
// that collapses back to the email itself (or its local part) as "not a real
// name yet" so callers ask for one instead of treating a login-looking
// string as already complete.
export function realNameOrEmpty(name: string, email: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.includes("@")) {
    return "";
  }
  const localPart = email.split("@")[0]?.toLowerCase();
  if (
    trimmed.toLowerCase() === email.toLowerCase() ||
    trimmed.toLowerCase() === localPart
  ) {
    return "";
  }
  return trimmed;
}
