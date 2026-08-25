import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChangelogCommentSection } from "@/components/changelog/changelog-comment-section";
import { ChangelogEditor } from "@/components/changelog/changelog-editor";
import { ChangelogEntryView } from "@/components/changelog/changelog-entry-view";
import { ContentContainer } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { listChangelogLabels } from "@/lib/changelog/labels";
import { getChangelogEntryById } from "@/lib/changelog/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string; entryId: string }>;
}

export const metadata: Metadata = { title: "Changelog Entry" };

export default async function EditChangelogEntryPage({ params }: Props) {
  const { slug, entryId } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  // Any member can view a published entry inside the workspace shell —
  // editing (and viewing drafts) is still Brand Admin/Owner only.
  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) {
    notFound();
  }
  const isAdminOrOwner = member.role !== WORKSPACE_MEMBER;

  const entry = await getChangelogEntryById(entryId, workspace.id);
  if (!entry) {
    notFound();
  }
  // Team Members never see drafts in the list either (listChangelogEntries
  // excludes them for non-admins) — stay consistent if one guesses a
  // draft's URL directly.
  if (!isAdminOrOwner && !entry.isPublished) {
    notFound();
  }

  const initialLabels = isAdminOrOwner
    ? await listChangelogLabels(workspace.id)
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!isAdminOrOwner && (
        <SetPageHeader
          backHref={`/${slug}/settings/changelog`}
          portalHref={
            entry.isPublished ? `/${slug}/changelog/${entry.id}` : null
          }
          title={entry.title}
        />
      )}
      <div className="flex-1 overflow-y-auto">
        {isAdminOrOwner ? (
          <ChangelogEditor
            initialEntry={{
              id: entry.id,
              title: entry.title,
              body: entry.body,
              coverImageUrl: entry.coverImageUrl,
              label: entry.label,
              isPublished: entry.isPublished,
              linkedPosts: entry.linkedPosts,
            }}
            initialLabels={initialLabels}
            pageDescription={
              entry.isPublished ? "Changes are immediately live" : undefined
            }
            pageTitle={
              entry.isPublished ? "Edit Published Entry" : "Edit Draft"
            }
            portalHref={
              entry.isPublished ? `/${slug}/changelog/${entry.id}` : null
            }
            workspaceId={workspace.id}
            workspaceSlug={slug}
          />
        ) : (
          <ChangelogEntryView entry={entry} workspaceSlug={slug} />
        )}
        <ContentContainer className="pb-10">
          <div className="pt-8">
            <ChangelogCommentSection
              canModerate={isAdminOrOwner}
              changelogEntryId={entry.id}
              currentUserId={session.user.id}
              isSignedIn={true}
            />
          </div>
        </ContentContainer>
      </div>
    </div>
  );
}
