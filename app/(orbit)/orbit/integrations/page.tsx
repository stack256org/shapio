import { getIntegrationSettingsStatusAction } from "@/app/actions/integration-settings";
import { IntegrationsPanel } from "@/components/settings/integrations/integrations-panel";
import { ContentContainerLeft } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { adminBaseUrl } from "@/lib/urls";

export const metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const status = await getIntegrationSettingsStatusAction();

  return (
    <div className="flex flex-col">
      <SetPageHeader
        description="Optional integrations — SMTP, Google sign-in, file storage, and webhooks. A saved value here always overrides the matching .env variable."
        portalHref={null}
        title="Integrations"
      />

      <ContentContainerLeft>
        <IntegrationsPanel appUrl={adminBaseUrl()} status={status} />
      </ContentContainerLeft>
    </div>
  );
}
