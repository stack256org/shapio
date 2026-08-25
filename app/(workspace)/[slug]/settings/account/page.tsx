import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountSettingsContent } from "@/components/profile/account-settings-content";
import { ContentContainer } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { requireSession } from "@/lib/authz";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Account Settings — ${slug}` };
}

export default async function WorkspaceAccountPage({ params }: Props) {
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

  return (
    <>
      <SetPageHeader
        description="Manage your personal profile, active sessions, and account data."
        title="Account Settings"
      />
      <ContentContainer>
        <AccountSettingsContent
          currentSessionToken={session.session.token}
          userId={session.user.id}
        />
      </ContentContainer>
    </>
  );
}
