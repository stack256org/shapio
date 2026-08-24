import { count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardMetricsSection } from "@/components/dashboard/dashboard-metrics-section";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RoadmapPreviewCard } from "@/components/dashboard/roadmap-preview-card";
import { SmtpNudgeBanner } from "@/components/dashboard/smtp-nudge-banner";
import { WorkspaceOverviewCard } from "@/components/dashboard/workspace-overview-card";
import { PostsTable } from "@/components/posts/posts-table";
import { SetPageHeader } from "@/components/workspace/topbar";
import { ADMIN_ROLE, WORKSPACE_MEMBER } from "@/config/platform";
import { workspaceMembers } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { getWorkspaceBoard } from "@/lib/boards/queries";
import { getActiveCategoriesForWorkspace } from "@/lib/categories/queries";
import type { ActivityType, BreakdownPeriod } from "@/lib/dashboard/queries";
import {
  getBreakdownMetrics,
  getFeedbackTrend,
  getPreviousPeriodSnapshot,
  getRecentActivity,
} from "@/lib/dashboard/queries";
import { db } from "@/lib/db";
import { isSmtpConfigured } from "@/lib/integration-settings";
import {
  countWorkspacePostsByStatus,
  listWorkspacePosts,
} from "@/lib/posts/queries";
import { getActiveWorkspaceStatuses } from "@/lib/workspace-statuses/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
  getWorkspaceOwnerName,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ activityType?: string; period?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  return { title: workspace?.name ?? "Workspace" };
}

export default async function WorkspaceDashboardPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { period, activityType } = await searchParams;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) {
    notFound();
  }

  const isAdminOrOwner = member.role !== WORKSPACE_MEMBER;
  // SMTP is a single platform-wide setting only an Orbit Admin can fix (from
  // /orbit/integrations) — a workspace admin/owner who isn't also an Orbit
  // Admin has no self-service path, so the nudge only shows to those who can
  // actually act on it.
  const isOrbitAdmin = session.user.role === ADMIN_ROLE;
  const showSmtpNudge =
    isAdminOrOwner && isOrbitAdmin && !(await isSmtpConfigured());
  const activePeriod: BreakdownPeriod =
    period === "7d" || period === "all" ? period : "30d";
  const activeActivityType: ActivityType =
    activityType === "post" ||
    activityType === "comment" ||
    activityType === "vote"
      ? activityType
      : "all";

  const now = new Date();

  const categories = await getActiveCategoriesForWorkspace(workspace.id);
  const categoryIds = categories.map((category) => category.id);

  const [
    board,
    [{ memberCount }],
    statusCounts,
    previousSnapshot,
    breakdown,
    feedbackTrend,
    recentActivity,
    newestPosts,
    workspaceStatuses,
    ownerName,
  ] = await Promise.all([
    getWorkspaceBoard(workspace.id),
    db
      .select({ memberCount: count() })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspace.id)),
    countWorkspacePostsByStatus(workspace.id),
    getPreviousPeriodSnapshot(workspace.id, activePeriod, now),
    getBreakdownMetrics(workspace.id, activePeriod, now),
    getFeedbackTrend(
      workspace.id,
      activePeriod,
      now,
      workspace.createdAt,
      categoryIds
    ),
    getRecentActivity(workspace.id, { limit: 8, type: activeActivityType }),
    listWorkspacePosts(workspace.id, {
      sort: "newest",
      userId: session.user.id,
      includeUnapproved: true,
      limit: 5,
    }),
    getActiveWorkspaceStatuses(workspace.id),
    getWorkspaceOwnerName(workspace.ownerId),
  ]);

  const addFeedbackHref = board ? `/${slug}/feedback/new` : null;

  return (
    <div className="flex flex-col">
      <SetPageHeader
        description={workspace.description || undefined}
        title={workspace.name}
      />

      <div className="space-y-8 px-4 py-8 sm:px-8">
        {showSmtpNudge && <SmtpNudgeBanner />}

        {/* Workspace Overview */}
        <WorkspaceOverviewCard
          boardIsPublic={board?.isPublic ?? null}
          categoriesCount={categories.length}
          changelogPublic={workspace.changelogPublic}
          createdAt={workspace.createdAt}
          description={workspace.description}
          isSuspended={workspace.isSuspended}
          logoUrl={workspace.logoUrl}
          memberCount={memberCount}
          name={workspace.name}
          ownerName={ownerName}
          postsCount={Object.values(statusCounts).reduce(
            (total, count) => total + count,
            0
          )}
          roadmapPublic={workspace.roadmapPublic}
          slug={workspace.slug}
          statusesCount={workspaceStatuses.length}
          updatedAt={workspace.updatedAt}
        />

        {/* Quick Actions */}
        <QuickActions
          addFeedbackHref={addFeedbackHref}
          isAdminOrOwner={isAdminOrOwner}
          workspaceSlug={slug}
        />
        <DashboardMetricsSection
          categories={categories}
          initialActivity={recentActivity}
          initialActivityType={activeActivityType}
          initialBreakdown={breakdown}
          initialFeedbackTrend={feedbackTrend}
          initialPeriod={activePeriod}
          initialPreviousSnapshot={previousSnapshot}
          isAdminOrOwner={isAdminOrOwner}
          memberCount={memberCount}
          slug={slug}
          statusCounts={statusCounts}
          workspaceCreatedAt={workspace.createdAt}
          workspaceId={workspace.id}
          workspaceStatuses={workspaceStatuses}
        />

        {/* Roadmap Preview */}
        <RoadmapPreviewCard
          roadmapPublic={workspace.roadmapPublic}
          workspaceSlug={slug}
        />

        {/* Newest Feedback */}
        <div className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          <div className="flex items-center justify-between gap-4 border-b border-ir-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ir-heading">
              Newest Feedback
            </h2>
            <Link
              className="rounded-ir-sm border border-ir-border px-3 py-1.5 text-xs font-medium text-ir-body transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface"
              href={`/${slug}/feedback`}
            >
              View All
            </Link>
          </div>
          <PostsTable
            categories={categories}
            isAdminOrOwner={isAdminOrOwner}
            isMember={true}
            isSignedIn={true}
            mergedIntoHref={(post) =>
              post.mergedIntoId
                ? `/${slug}/feedback/${post.mergedIntoId}`
                : null
            }
            postHref={(post) => `/${slug}/feedback/${post.id}`}
            posts={newestPosts}
            workspaceId={workspace.id}
            workspaceStatuses={workspaceStatuses}
          />
        </div>

        {/* Getting started */}
        {/* {memberCount === 1 && (
          <div className="rounded-ir-card border border-ir-border bg-ir-muted-surface px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-ir-sm border border-ir-border bg-ir-surface">
                <UsersThree className="size-4 text-ir-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ir-heading">
                  Invite your team
                </p>
                <p className="mt-1 text-xs text-ir-muted">
                  Team members can review feedback and keep your users updated.
                </p>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}
