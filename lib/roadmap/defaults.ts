// Default columns for a manual (Sync OFF) roadmap. Seeded lazily the first time
// a workspace needs a manual roadmap and has none yet.
export const DEFAULT_ROADMAP_STATUSES = [
  { name: "Coming Up", color: "#3b82f6", displayOrder: 0 },
  { name: "Just Live", color: "#059669", displayOrder: 1 },
  { name: "Archived", color: "#6b7280", displayOrder: 2 },
] as const;
