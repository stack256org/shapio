// Pure, DB-free constants/types shared between server queries
// (lib/dashboard/queries.ts) and client components (e.g.
// DashboardMetricsSection). Kept in their own file — importing anything at
// runtime from queries.ts (even a single named export) drags its top-level
// `@/lib/db` import, and therefore the Postgres driver, into the client
// bundle, which fails to resolve Node built-ins like `fs` in the browser.

export type BreakdownPeriod = "7d" | "30d" | "all";

export const PERIOD_LABELS: Record<BreakdownPeriod, string | null> = {
  "7d": "the previous 7 days",
  "30d": "the previous 30 days",
  all: null,
};

// The chart data-point key a given category's per-day count is stored under
// (also used as the recharts `dataKey` for that category's series) — kept
// distinct from "date"/"total" so a category can never collide with them.
export function categoryTrendKey(categoryId: string): string {
  return `cat_${categoryId}`;
}
