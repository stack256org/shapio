import { createId } from "@paralleldrive/cuid2";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { posts } from "@/db/schema/posts";
import { roadmapStatuses } from "@/db/schema/roadmap-statuses";
import { workspaces } from "@/db/schema/workspaces";

// A manually-managed roadmap card. Only used when "Sync Roadmap from Feedback"
// is OFF. Each item lives in a roadmap_status column and is fully independent of
// feedback — feedbackId records the one-time "Fill from Feedback" import origin
// (nullable) but is NOT a live link: later feedback edits never touch the item.
export const roadmapItems = pgTable(
  "roadmap_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // The column this item belongs to. Deleting a column is blocked while it
    // holds items (service-level guard), so "restrict" is the correct posture.
    statusId: text("status_id")
      .notNull()
      .references(() => roadmapStatuses.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    launchDate: timestamp("launch_date", { withTimezone: true }),
    coverImage: text("cover_image"),
    // Origin of a one-time "Fill from Feedback" import. Kept for provenance only;
    // set null if the source post is later deleted. Never used to auto-sync.
    feedbackId: text("feedback_id").references(() => posts.id, {
      onDelete: "set null",
    }),
    // Always "manual" today — the item is independent the moment it is created.
    // Stored for schema symmetry with the spec and future sync modes.
    syncMode: text("sync_mode").notNull().default("manual"),
    // Static display counters (manual items have no live voting/comments yet).
    voteCount: integer("vote_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("roadmap_items_workspace_id_idx").on(t.workspaceId),
    index("roadmap_items_status_order_idx").on(t.statusId, t.displayOrder),
    index("roadmap_items_feedback_id_idx").on(t.feedbackId),
  ]
);
