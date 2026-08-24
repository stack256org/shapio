import { notFound } from "next/navigation";
import { NotificationList } from "@/components/notifications/notification-list";
import { ContentContainer } from "@/components/ui/page";
import { requireSession } from "@/lib/authz";
import { listNotifications } from "@/lib/notifications/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NotificationsPage({ params }: Props) {
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

  // Notifications are intentionally NOT bulk-marked read on load — the unread
  // distinction is preserved until the user actually opens each one (or uses
  // "Mark all as read").

  const { items, total, hasMore } = await listNotifications(session.user.id, {
    page: 1,
    limit: 30,
  });

  return (
    <ContentContainer>
      <NotificationList
        hasMore={hasMore}
        initialItems={items}
        total={total}
        workspaceId={workspace.id}
      />
    </ContentContainer>
  );
}
