// Default categories seeded into every new workspace (mirrors
// DEFAULT_WORKSPACE_STATUSES). A workspace ships with these so the category
// picker is never empty. Every post always has a category — the first one
// here (displayOrder 0) is seeded as the workspace's default (see
// lib/categories/create.ts) and is the one new posts fall back to.
export const DEFAULT_CATEGORIES = [
  {
    name: "Feature Request",
    slug: "feature-request",
    color: "#6366f1",
    displayOrder: 0,
  },
  {
    name: "Bug",
    slug: "bug",
    color: "#ef4444",
    displayOrder: 1,
  },
  {
    name: "Improvement",
    slug: "improvement",
    color: "#22c55e",
    displayOrder: 2,
  },
] as const;
