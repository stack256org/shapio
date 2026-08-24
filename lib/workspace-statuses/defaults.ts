// Default feedback statuses seeded for a new workspace — matches the
// reference product's (Upvoty) 5-status flow: Draft -> In Review -> In
// Progress -> Completed/Declined.
//
// `showOnRoadmap` is the explicit roadmap-visibility whitelist for Sync-ON
// mode: In Progress, Completed, and Declined create roadmap columns by
// default (Declined stays visible there for transparency on what was
// considered and passed on); In Review (intake) and Draft never do, unless a
// Brand Admin explicitly enables them in Statuses settings.
//
// `showOnPublicFeed` is a separate flag controlling the public feedback
// list/board and direct post URLs. Completed and Declined are seeded with
// this off — resolved feedback (shipped or passed on) stays off the public
// feed (still visible on the public Roadmap and in the admin panel).
export const DEFAULT_WORKSPACE_STATUSES = [
  {
    name: "In Review",
    slug: "in_review",
    color: "#3b82f6",
    isDefault: true,
    displayOrder: 0,
    showOnRoadmap: false,
    showOnPublicFeed: true,
    isSystem: false,
  },
  {
    name: "In Progress",
    slug: "in_progress",
    color: "#d97706",
    isDefault: false,
    displayOrder: 1,
    showOnRoadmap: true,
    showOnPublicFeed: true,
    isSystem: false,
  },
  {
    name: "Completed",
    slug: "completed",
    color: "#059669",
    isDefault: false,
    displayOrder: 2,
    showOnRoadmap: true,
    showOnPublicFeed: false,
    isSystem: false,
  },
  {
    name: "Declined",
    slug: "declined",
    color: "#ef4444",
    isDefault: false,
    displayOrder: 3,
    showOnRoadmap: true,
    showOnPublicFeed: false,
    isSystem: false,
  },
  {
    name: "Draft",
    slug: "draft",
    color: "#6b7280",
    isDefault: false,
    displayOrder: -1,
    showOnRoadmap: false,
    showOnPublicFeed: false,
    isSystem: true,
  },
] as const;
