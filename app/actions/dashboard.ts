"use server";

import { requireSession } from "@/lib/authz";
import {
  type ActivityType,
  type BreakdownPeriod,
  getBreakdownMetrics,
  getFeedbackTrend,
  getPreviousPeriodSnapshot,
  getRecentActivity,
} from "@/lib/dashboard/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

async function assertMember(workspaceId: string) {
  const session = await requireSession();
  const member = await getWorkspaceMember(workspaceId, session.user.id);
  if (!member) {
    throw new Error("Not a member of this workspace.");
  }
}

// Re-fetches everything the Breakdown card, stat card deltas, and Feedback
// Trend chart need for a newly selected period — called from the dashboard's
// client-side filter instead of navigating, so switching periods never
// reloads the rest of the page or resets scroll.
export async function getDashboardPeriodDataAction(
  workspaceId: string,
  period: BreakdownPeriod,
  workspaceCreatedAt: Date,
  categoryIds: string[]
) {
  await assertMember(workspaceId);
  const now = new Date();
  const [previousSnapshot, breakdown, feedbackTrend] = await Promise.all([
    getPreviousPeriodSnapshot(workspaceId, period, now),
    getBreakdownMetrics(workspaceId, period, now),
    getFeedbackTrend(workspaceId, period, now, workspaceCreatedAt, categoryIds),
  ]);
  return { breakdown, feedbackTrend, previousSnapshot };
}

// Same idea for the Live Stream card's activity-type filter.
export async function getDashboardActivityAction(
  workspaceId: string,
  activityType: ActivityType
) {
  await assertMember(workspaceId);
  return getRecentActivity(workspaceId, { limit: 8, type: activityType });
}
