import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChangelogAdminCard } from "@/components/changelog/changelog-admin-card";
import { ChangelogEntryCard } from "@/components/changelog/changelog-entry-card";
import { Button } from "@/components/ui/button";
import { ListSearch } from "@/components/workspace/list-search";
import { SetPageHeader } from "@/components/workspace/topbar";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { listChangelogEntries } from "@/lib/changelog/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import { ChangelogStatusFilter } from "./_components/changelog-status-filter";
import { NewEntryButton } from "./_components/new-entry-button";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  return { title: workspace ? `Changelog — ${workspace.name}` : "Changelog" };
}

export default async function WorkspaceChangelogPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { q, status: statusParam } = await searchParams;
  const searchQuery = q ?? "";
  const status: "all" | "draft" | "published" =
    statusParam === "draft" || statusParam === "published"
      ? statusParam
      : "all";

  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) {
    notFound();
  }

  const isAdmin = member.role !== WORKSPACE_MEMBER;

  const { entries, total } = await listChangelogEntries(workspace.id, {
    includeDrafts: isAdmin,
    limit: 50,
    search: searchQuery || undefined,
  });

  const drafts = isAdmin ? entries.filter((e) => !e.isPublished) : [];
  const published = entries.filter((e) => e.isPublished);
  const showDrafts = isAdmin && (status === "all" || status === "draft");
  const showPublished = status === "all" || status === "published";

  return (
    <div className="flex flex-col">
      <SetPageHeader
        actions={
          isAdmin ? (
            <>
              <ChangelogStatusFilter activeStatus={status} />
              <NewEntryButton slug={slug} />
            </>
          ) : undefined
        }
        beforeActions={
          <ListSearch
            className=""
            defaultValue={searchQuery}
            placeholder="Search updates"
          />
        }
        description={
          published.length === 0 && drafts.length === 0
            ? "No updates published yet."
            : isAdmin
              ? `${published.length} published · ${drafts.length} draft${drafts.length === 1 ? "" : "s"}`
              : `${total} update${total === 1 ? "" : "s"} published`
        }
        title="Changelog"
      />

      {/* Content */}
      <div className="px-4 py-6 sm:px-8">
        {/* Drafts (admin only) */}
        {showDrafts && drafts.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ir-muted">
              Drafts ({drafts.length})
            </h2>
            <div className="space-y-3">
              {drafts.map((entry) => (
                <ChangelogAdminCard
                  entry={entry}
                  key={entry.id}
                  workspaceId={workspace.id}
                  workspaceSlug={slug}
                />
              ))}
            </div>
          </div>
        )}

        {/* Published entries */}
        {showPublished && published.length > 0 && (
          <div>
            {showDrafts && drafts.length > 0 && (
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ir-muted">
                Published ({published.length})
              </h2>
            )}
            {isAdmin ? (
              <div className="space-y-3">
                {published.map((entry) => (
                  <ChangelogAdminCard
                    entry={entry}
                    key={entry.id}
                    workspaceId={workspace.id}
                    workspaceSlug={slug}
                  />
                ))}
              </div>
            ) : (
              <div>
                {published.map((entry) => (
                  <ChangelogEntryCard
                    entry={entry}
                    key={entry.id}
                    workspaceSlug={slug}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state — nothing visible under the current filter/search */}
        {(!showDrafts || drafts.length === 0) &&
          (!showPublished || published.length === 0) && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm font-medium text-ir-heading">
                {searchQuery
                  ? `No updates match “${searchQuery}”`
                  : status === "draft"
                    ? "No drafts"
                    : status === "published"
                      ? "No published updates"
                      : "Nothing here yet"}
              </p>
              <p className="mt-1 text-xs text-ir-muted">
                {searchQuery
                  ? "Try a different search term."
                  : status === "all"
                    ? "Check back soon for product updates and announcements."
                    : "Try a different filter."}
              </p>
              {isAdmin && !searchQuery && status !== "published" && (
                <Button asChild className="mt-4">
                  <Link href={`/${slug}/settings/changelog/new`}>
                    Create your first entry
                  </Link>
                </Button>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
