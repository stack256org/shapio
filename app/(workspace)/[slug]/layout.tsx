import { notFound, redirect } from "next/navigation";
import { NotificationsProvider } from "@/components/notifications/notifications-context";
import { PortalHrefProvider } from "@/components/workspace/open-portal-button";
import { Topbar, TopbarProvider } from "@/components/workspace/topbar";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { WorkspaceSuspendedPage } from "@/components/workspace/workspace-suspended";
import { ADMIN_ROLE, WORKSPACE_MEMBER } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { getWorkspaceBoard } from "@/lib/boards/queries";
import { getUnreadCount } from "@/lib/notifications/queries";
import { needsPasswordSetup } from "@/lib/users/password";
import {
  getUserWorkspaces,
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { slug } = await params;

  const session = await getCurrentSession();

  // The entire workspace app is a separate, member-only application from the
  // public portal — it must never redirect an unauthenticated or non-member
  // visitor into the public portal. Anonymous visitors go to sign-in (with
  // `next` preserved so they land back here once authenticated); signed-in
  // non-members (customers) get a 404, keeping the admin area's existence
  // invisible to them, same as the rest of the admin surface.
  if (!session) {
    redirect(`/signin?next=${encodeURIComponent(`/${slug}`)}`);
  }

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  // A suspended workspace is unavailable to everyone (PLATFORM.md §6) —
  // platform admins govern it from /orbit, not from the live workspace.
  if (workspace.isSuspended) {
    return <WorkspaceSuspendedPage />;
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) {
    notFound();
  }

  // A workspace created by the one-time /setup wizard stays parked on that
  // wizard until its owner steps through account + workspace creation once —
  // SMTP is no longer required to clear this flag (Skip/Finish both clear
  // it; see completeFirstRunSetupAction). Workspaces created through normal
  // onboarding never set this flag, so they're unaffected. Enforced here
  // (not just at the wizard's own buttons) so a typed URL can't bypass it.
  if (workspace.requiresIntegrationSetup) {
    redirect("/setup");
  }

  // A member who joined by invite has no password (magic link never sets one)
  // and, while email + password sign-in is enabled, no way to obtain one —
  // reset needs a credential row that does not exist yet. Finish that setup
  // before letting them into the workspace, so they cannot end up locked out
  // of the very sign-in method the instance advertises. Enforced here rather
  // than only at the invite-accept redirect, which a typed URL would bypass.
  // Google-linked members are exempt (they already have a way in) — see
  // needsPasswordSetup.
  if (await needsPasswordSetup(session.user.id)) {
    redirect(`/complete-profile?next=${encodeURIComponent(`/${slug}`)}`);
  }

  const isOrbitAdmin = session.user.role === ADMIN_ROLE;
  const isAdminOrOwner = member.role !== WORKSPACE_MEMBER;
  const email = session.user.email;
  const userWorkspaces = await getUserWorkspaces(session.user.id);
  const unreadCount = await getUnreadCount(session.user.id);

  // Resolve the workspace's public-portal entry point once, shared with every
  // page header via context (same logic as the Dashboard button): the public
  // roadmap if enabled, else the public board, else nothing.
  const board = await getWorkspaceBoard(workspace.id);
  const portalHref = workspace.roadmapPublic
    ? `/${slug}/roadmap`
    : board?.isPublic
      ? `/${slug}/b/${board.slug}`
      : null;

  return (
    <NotificationsProvider initialUnreadCount={unreadCount}>
      <div className="fixed inset-0 flex flex-col overflow-hidden md:flex-row">
        <WorkspaceSidebar
          email={email}
          initialUnreadCount={unreadCount}
          isAdminOrOwner={isAdminOrOwner}
          isOrbitAdmin={isOrbitAdmin}
          userImage={session.user.image ?? null}
          workspaceLogoUrl={workspace.logoUrl}
          workspaceName={workspace.name}
          workspaceSlug={workspace.slug}
          workspaces={userWorkspaces}
        />

        {/* Main content */}
        <main
          className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-base-100"
          id="main-content"
        >
          <PortalHrefProvider href={portalHref}>
            <TopbarProvider
              defaultHeader={{
                title: workspace.name,
                description: workspace.description,
              }}
              key={workspace.id}
            >
              <Topbar />
              {children}
            </TopbarProvider>
          </PortalHrefProvider>
        </main>
      </div>
    </NotificationsProvider>
  );
}
