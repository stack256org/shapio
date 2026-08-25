import { notFound } from "next/navigation";
import { NotificationPreferencesForm } from "@/components/profile/notification-preferences-form";
import { ContentContainer } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { requireSession } from "@/lib/authz";
import { getNotificationPreferences } from "@/lib/notifications/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NotificationPreferencesPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) {
    notFound();
  }

  const prefs = await getNotificationPreferences(session.user.id);

  const defaults = {
    emailStatusChange: prefs?.emailStatusChange ?? true,
    emailNewComment: prefs?.emailNewComment ?? true,
    emailChangelog: prefs?.emailChangelog ?? true,
    inAppStatusChange: prefs?.inAppStatusChange ?? true,
    inAppNewComment: prefs?.inAppNewComment ?? true,
    inAppChangelog: prefs?.inAppChangelog ?? true,
  };

  return (
    <>
      <SetPageHeader
        description="Control which notifications you receive via email and in-app."
        title="Notification Preferences"
      />
      <ContentContainer>
        <NotificationPreferencesForm initialPrefs={defaults} />
      </ContentContainer>
    </>
  );
}
