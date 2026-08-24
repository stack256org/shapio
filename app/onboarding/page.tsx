import { redirect } from "next/navigation";
import { OnboardingForm } from "@/app/onboarding/_components/onboarding-form";
import { OnboardingWizard } from "@/app/onboarding/_components/onboarding-wizard";
import { requireSession } from "@/lib/authz";
import { portalBaseUrl } from "@/lib/urls";
import { realNameOrEmpty } from "@/lib/users/profile-name";
import { getPendingInviteTokenForEmail } from "@/lib/workspaces/invites";
import { getFirstUserWorkspace } from "@/lib/workspaces/queries";

export const metadata = {
  title: "Create your workspace",
};

interface OnboardingPageProps {
  searchParams: Promise<{ new?: string }>;
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const session = await requireSession();
  const { new: isNew } = await searchParams;

  // Redirect if the user already has a workspace — unless they explicitly asked
  // to create another one (via the workspace switcher's "Create workspace").
  if (!isNew) {
    const existing = await getFirstUserWorkspace(session.user.id);
    if (existing) {
      redirect(`/${existing.slug}`);
    }

    // No workspace, but a Brand Admin already invited this address — send
    // them to finish accepting rather than let them create a separate
    // workspace of their own. Mirrors the same guard in /post-auth.
    const inviteToken = await getPendingInviteTokenForEmail(session.user.email);
    if (inviteToken) {
      redirect(`/invite/${inviteToken}`);
    }
  }

  // The slug preview shows the brand's shareable public address, which lives on
  // the Public Portal host.
  const portalUrl = new URL(portalBaseUrl());
  const appHost =
    portalUrl.hostname + (portalUrl.port ? `:${portalUrl.port}` : "");

  // The multi-step welcome wizard is only for a genuinely first-time signup.
  // Someone already using the product who's adding an extra workspace (the
  // workspace switcher's "Create workspace", ?new=1) gets the plain
  // single-step form unchanged — a second "Welcome!"/"How would you like to
  // use Shapio?" would make no sense for them.
  if (isNew) {
    return <OnboardingForm appHost={appHost} isAdditional />;
  }

  return (
    <OnboardingWizard
      appHost={appHost}
      initialName={realNameOrEmpty(session.user.name, session.user.email)}
    />
  );
}
