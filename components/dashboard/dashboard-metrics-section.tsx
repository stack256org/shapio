"use client";

import { useState, useTransition } from "react";
import {
  getDashboardActivityAction,
  getDashboardPeriodDataAction,
} from "@/app/actions/dashboard";
import { BreakdownCard } from "@/components/dashboard/breakdown-card";
import { FeedbackTrendCard } from "@/components/dashboard/feedback-trend-card";
import { LiveStreamCard } from "@/components/dashboard/live-stream-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { PERIOD_LABELS } from "@/lib/dashboard/constants";
import type {
  ActivityItem,
  ActivityType,
  BreakdownMetrics,
  BreakdownPeriod,
  FeedbackTrendPoint,
  StatusCountSnapshot,
} from "@/lib/dashboard/queries";

interface Category {
  color: string;
  id: string;
  name: string;
}

interface WorkspaceStatus {
  color: string;
  id: string;
  name: string;
  slug: string;
}

interface DashboardMetricsSectionProps {
  categories: Category[];
  initialActivity: ActivityItem[];
  initialActivityType: ActivityType;
  initialBreakdown: BreakdownMetrics;
  initialFeedbackTrend: FeedbackTrendPoint[];
  initialPeriod: BreakdownPeriod;
  initialPreviousSnapshot: StatusCountSnapshot | null;
  isAdminOrOwner: boolean;
  memberCount: number;
  slug: string;
  statusCounts: Record<string, number>;
  workspaceCreatedAt: Date;
  workspaceId: string;
  workspaceStatuses: WorkspaceStatus[];
}

// Keeps ?period=/?activityType= in the URL for shareable/bookmarkable links,
// without going through Next.js's router — a real navigation would re-run
// the whole page (every card, not just these two) and jump scroll to top.
function syncSearchParam(name: string, value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  window.history.replaceState(null, "", url);
}

// Feedback trend, stat cards, Breakdown, and Live Stream all live in one
// client component because "period" drives all of the first three at once
// (stat card deltas, the Breakdown rows, and the trend chart) — filtering it
// re-fetches just that data via a Server Action and updates local state, so
// nothing above (Workspace Overview, Quick Actions) or below (Roadmap
// Preview, Newest Feedback) re-renders, and the page never navigates or
// scrolls.
export function DashboardMetricsSection({
  categories,
  initialActivity,
  initialActivityType,
  initialBreakdown,
  initialFeedbackTrend,
  initialPeriod,
  initialPreviousSnapshot,
  isAdminOrOwner,
  memberCount,
  slug,
  statusCounts,
  workspaceCreatedAt,
  workspaceId,
  workspaceStatuses,
}: DashboardMetricsSectionProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [breakdown, setBreakdown] = useState(initialBreakdown);
  const [feedbackTrend, setFeedbackTrend] = useState(initialFeedbackTrend);
  const [previousSnapshot, setPreviousSnapshot] = useState(
    initialPreviousSnapshot
  );
  const [isPeriodPending, startPeriodTransition] = useTransition();

  const [activityType, setActivityType] = useState(initialActivityType);
  const [activity, setActivity] = useState(initialActivity);
  const [isActivityPending, startActivityTransition] = useTransition();

  function handlePeriodChange(next: BreakdownPeriod) {
    setPeriod(next);
    syncSearchParam("period", next);
    startPeriodTransition(async () => {
      const data = await getDashboardPeriodDataAction(
        workspaceId,
        next,
        workspaceCreatedAt,
        categories.map((category) => category.id)
      );
      setBreakdown(data.breakdown);
      setFeedbackTrend(data.feedbackTrend);
      setPreviousSnapshot(data.previousSnapshot);
    });
  }

  function handleActivityTypeChange(next: ActivityType) {
    setActivityType(next);
    syncSearchParam("activityType", next);
    startActivityTransition(async () => {
      const data = await getDashboardActivityAction(workspaceId, next);
      setActivity(data);
    });
  }

  const totalPosts = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);

  const periodLabel = PERIOD_LABELS[period] ?? undefined;
  const previousMemberCount = previousSnapshot?.memberCount ?? null;
  const previousTotalPosts = previousSnapshot
    ? Object.values(previousSnapshot.statusCounts).reduce(
        (sum, n) => sum + n,
        0
      )
    : null;

  return (
    <>
      {/* Feedback trend */}
      <FeedbackTrendCard
        categories={categories}
        isPending={isPeriodPending}
        points={feedbackTrend}
        weekly={period === "all"}
      />

      {/* Stat cards — flex-wrap (not grid) so an incomplete last row (the
          status count depends on how many statuses the workspace has
          configured) grows to fill the row instead of leaving a bare gap
          where a trailing grid column would otherwise sit empty. */}
      <div className="flex flex-wrap gap-3">
        <div className="grow shrink-0 basis-[calc(50%-0.375rem)] sm:basis-[calc(25%-0.5625rem)]">
          <StatCard
            href={isAdminOrOwner ? `/${slug}/settings/members` : undefined}
            label="Members"
            periodLabel={periodLabel}
            previousValue={previousMemberCount}
            value={memberCount}
          />
        </div>
        <div className="grow shrink-0 basis-[calc(50%-0.375rem)] sm:basis-[calc(25%-0.5625rem)]">
          <StatCard
            href={`/${slug}/feedback`}
            label="Total posts"
            periodLabel={periodLabel}
            previousValue={previousTotalPosts}
            value={totalPosts}
          />
        </div>
        {workspaceStatuses.map((status) => (
          <div
            className="grow shrink-0 basis-[calc(50%-0.375rem)] sm:basis-[calc(25%-0.5625rem)]"
            key={status.id}
          >
            <StatCard
              href={`/${slug}/feedback?status=${status.slug}`}
              label={status.name}
              periodLabel={periodLabel}
              previousValue={
                previousSnapshot
                  ? (previousSnapshot.statusCounts[status.slug] ?? 0)
                  : null
              }
              value={statusCounts[status.slug] ?? 0}
              valueStyle={{ color: status.color }}
            />
          </div>
        ))}
      </div>

      {/* Breakdown + Live Stream — both cards stretch (CSS Grid's default) to
          match row height. Live Stream's own list is capped with an internal
          scroll (see live-stream-card.tsx) so that height stays reasonable
          regardless of activity count, instead of growing unbounded and
          leaving Breakdown either badly stretched or with a bare gap beside
          it depending on alignment. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownCard
          isPending={isPeriodPending}
          metrics={breakdown}
          onPeriodChange={handlePeriodChange}
          period={period}
        />
        <LiveStreamCard
          activity={activity}
          activityType={activityType}
          isPending={isActivityPending}
          onActivityTypeChange={handleActivityTypeChange}
          workspaceSlug={slug}
        />
      </div>
    </>
  );
}
