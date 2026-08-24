import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompleteProfileForm } from "@/app/complete-profile/_components/complete-profile-form";
import { requireSession } from "@/lib/authz";
import { needsPasswordSetup } from "@/lib/users/password";
import { realNameOrEmpty } from "@/lib/users/profile-name";

export const metadata: Metadata = {
  title: "Complete your profile",
};

interface Props {
  searchParams: Promise<{ next?: string }>;
}

// Mirrors auth-form.tsx's `next` handling: only relative paths are honored,
// so this can't be turned into an open redirect via a crafted query param.
function safeNext(raw: string | undefined): string {
  return raw?.startsWith("/") && !raw.startsWith("//") ? raw : "/post-auth";
}

export default async function CompleteProfilePage({ searchParams }: Props) {
  const session = await requireSession();
  const target = safeNext((await searchParams).next);

  // Two things can be outstanding here, independently:
  //
  //  1. A display name — magic-link sign-in never collects one (Better Auth
  //     derives a placeholder from the email); Google sign-in does.
  //  2. A password — magic-link creates an account WITHOUT one. That only
  //     matters when this instance actually offers email + password sign-in;
  //     otherwise a password would be dead weight. It is collected here
  //     rather than left for later because there is no recovery path: reset
  //     requires a credential row that does not exist yet, so someone who
  //     skipped this could never sign in by password at all. They can still
  //     change it afterwards from account settings.
  //
  // A Google user already has a real name AND a working way in, so both
  // checks come back false for them and this page redirects straight through.
  const needsProfile = !realNameOrEmpty(session.user.name, session.user.email);
  const needsPassword = await needsPasswordSetup(session.user.id);

  // Nothing left to complete — don't make anyone stare at an empty form.
  if (!(needsProfile || needsPassword)) {
    redirect(target);
  }

  return (
    <CompleteProfileForm
      email={session.user.email}
      needsPassword={needsPassword}
      needsProfile={needsProfile}
      next={target}
    />
  );
}
