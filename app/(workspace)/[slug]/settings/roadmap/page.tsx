import { InfoIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  type BoardStatus,
  ManualRoadmapBoard,
} from "@/components/roadmap/manual/manual-roadmap-board";
import type { BoardItem } from "@/components/roadmap/manual/manual-roadmap-card";
import {
  ManualRoadmapAddItemButton,
  ManualRoadmapManageColumnsButton,
  ManualRoadmapProvider,
  ManualRoadmapSearchInput,
} from "@/components/roadmap/manual/manual-roadmap-search-context";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { RoadmapSyncToggle } from "@/components/roadmap/roadmap-sync-toggle";
import { ListSearch } from "@/components/workspace/list-search";
import { SetPageHeader } from "@/components/workspace/topbar";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { getDerivedRoadmap } from "@/lib/roadmap/derived";
import { getManualRoadmap } from "@/lib/roadmap/manual";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  return { title: workspace ? `Roadmap — ${workspace.name}` : "Roadmap" };
}

export default async function WorkspaceRoadmapPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { q } = await searchParams;
  const searchQuery = q ?? "";
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

  // ── Sync OFF: independent, manually managed roadmap ──────────────────────
  if (!workspace.roadmapSyncEnabled) {
    const { columns } = await getManualRoadmap(workspace.id);
    const statuses: BoardStatus[] = columns.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      itemCount: c.items.length,
    }));
    const items: BoardItem[] = columns.flatMap((c) =>
      c.items.map((i) => ({
        id: i.id,
        statusId: i.statusId,
        title: i.title,
        description: i.description,
        launchDate: i.launchDate ? i.launchDate.toISOString() : null,
        coverImage: i.coverImage,
        voteCount: i.voteCount,
        commentCount: i.commentCount,
        feedbackId: i.feedbackId,
      }))
    );
    const totalItems = items.length;

    return (
      <ManualRoadmapProvider>
        <div className="flex min-h-0 flex-1 flex-col">
          <SetPageHeader
            actions={
              isAdmin ? (
                <>
                  <ManualRoadmapManageColumnsButton />
                  <ManualRoadmapAddItemButton
                    disabled={statuses.length === 0}
                  />
                </>
              ) : undefined
            }
            beforeActions={<ManualRoadmapSearchInput />}
            description={
              totalItems === 0
                ? "No items on the roadmap yet."
                : `${totalItems} item${totalItems === 1 ? "" : "s"} across all columns`
            }
            title="Roadmap"
          />
          <ManualRoadmapBoard
            canManage={isAdmin}
            items={items}
            statuses={statuses}
            syncToggle={
              isAdmin ? (
                <RoadmapSyncToggle enabled={false} workspaceId={workspace.id} />
              ) : undefined
            }
            workspaceId={workspace.id}
          />
        </div>
      </ManualRoadmapProvider>
    );
  }

  // ── Sync ON: derived from feedback statuses, read-only ───────────────────
  const columns = await getDerivedRoadmap(workspace.id, {
    isAdmin: true,
    userId: session.user.id,
    search: searchQuery || undefined,
  });
  const totalPosts = columns.reduce((n, c) => n + c.posts.length, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SetPageHeader
        beforeActions={
          <ListSearch
            className=""
            defaultValue={searchQuery}
            placeholder="Search roadmap"
          />
        }
        description={
          totalPosts === 0
            ? searchQuery
              ? `No roadmap items match “${searchQuery}”.`
              : "No items on the roadmap yet."
            : `${totalPosts} item${totalPosts === 1 ? "" : "s"} across all columns`
        }
        title="Roadmap"
      />
      {isAdmin && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-base-300 px-4 py-4 sm:px-8">
          <RoadmapSyncToggle enabled={true} workspaceId={workspace.id} />
          <div className="flex items-center gap-2 rounded-ir-md border border-ir-warning/30 bg-ir-warning/10 px-3 py-2 text-xs font-medium text-ir-warning">
            <InfoIcon className="size-3.5 shrink-0" />
            Admin view includes posts from private boards
          </div>
        </div>
      )}
      <RoadmapBoard
        canManage={true}
        columns={columns}
        isSignedIn={true}
        useWorkspaceLinks={true}
        workspaceId={workspace.id}
        workspaceSlug={slug}
      />
    </div>
  );
}
