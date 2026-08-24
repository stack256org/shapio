import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Topbar, TopbarProvider } from "@/components/workspace/topbar";
import { requireAdmin } from "@/lib/authz";
import { getFirstUserWorkspace } from "@/lib/workspaces/queries";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdmin();
  const workspace = await getFirstUserWorkspace(session.user.id);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-base-100 md:flex-row">
      <AdminSidebar
        email={session.user.email}
        image={session.user.image ?? null}
        workspaceSlug={workspace?.slug}
      />
      <main
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
        id="main-content"
      >
        <TopbarProvider defaultHeader={{ title: "Platform Admin" }}>
          <Topbar />
          {children}
        </TopbarProvider>
      </main>
    </div>
  );
}
