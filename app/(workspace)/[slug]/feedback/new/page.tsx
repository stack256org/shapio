import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentContainer } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { requireSession } from "@/lib/authz";
import { getWorkspaceBoard } from "@/lib/boards/queries";
import { getActiveCategoriesForWorkspace } from "@/lib/categories/queries";
import { getActiveWorkspaceStatuses } from "@/lib/workspace-statuses/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import { NewFeedbackForm } from "../_components/new-feedback-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: "New Feedback" };

export default async function NewFeedbackPage({ params }: Props) {
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

  const board = await getWorkspaceBoard(workspace.id);
  if (!board) {
    notFound();
  }

  const [categories, workspaceStatuses] = await Promise.all([
    getActiveCategoriesForWorkspace(workspace.id),
    getActiveWorkspaceStatuses(workspace.id),
  ]);

  return (
    <>
      <SetPageHeader backHref={`/${slug}/feedback`} title="New Feedback" />
      <ContentContainer>
        <NewFeedbackForm
          boardId={board.id}
          categories={categories}
          workspaceId={workspace.id}
          workspaceSlug={slug}
          workspaceStatuses={workspaceStatuses}
        />
      </ContentContainer>
    </>
  );
}
