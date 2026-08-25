import { redirect } from "next/navigation";
import { SetupWizard } from "@/app/setup/setup-wizard";
import { getCurrentSession } from "@/lib/authz";
import { hasAnyUser } from "@/lib/setup";
import { adminBaseUrl, portalBaseUrl } from "@/lib/urls";
import { getIncompleteBootstrapWorkspace } from "@/lib/workspaces/queries";

export const metadata = {
  title: "Set up your instance",
};

export default async function SetupPage() {
  // The slug preview shows the brand's shareable public address, which lives
  // on the Public Portal host — same computation as onboarding's page.
  const portalUrl = new URL(portalBaseUrl());
  const appHost =
    portalUrl.hostname + (portalUrl.port ? `:${portalUrl.port}` : "");

  // Runs once — once any user exists, the account-creation step disappears.
  if (!(await hasAnyUser())) {
    return <SetupWizard adminUrl={adminBaseUrl()} appHost={appHost} />;
  }

  // The instance is initialized, but the first admin may still have a
  // workspace stuck on the integrations step (tab closed, session expired,
  // or WorkspaceLayout bounced them back here). Resume straight into that
  // step rather than 404ing them on a page that "shouldn't" exist anymore.
  const session = await getCurrentSession();
  const incompleteWorkspace = session
    ? await getIncompleteBootstrapWorkspace(session.user.id)
    : null;

  if (incompleteWorkspace) {
    return (
      <SetupWizard
        adminUrl={adminBaseUrl()}
        appHost={appHost}
        resumeWorkspaceSlug={incompleteWorkspace.slug}
      />
    );
  }

  redirect("/signin");
}
