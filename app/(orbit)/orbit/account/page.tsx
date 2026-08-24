import { AccountSettingsContent } from "@/components/profile/account-settings-content";
import { ContentContainerLeft } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { requireAdmin } from "@/lib/authz";

export const metadata = { title: "Account Settings" };

export default async function OrbitAccountPage() {
  const session = await requireAdmin();

  return (
    <div className="flex flex-col">
      <SetPageHeader
        description="Manage your personal profile, active sessions, and account data."
        portalHref={null}
        title="Account Settings"
      />
      <ContentContainerLeft>
        <AccountSettingsContent
          currentSessionToken={session.session.token}
          userId={session.user.id}
        />
      </ContentContainerLeft>
    </div>
  );
}
