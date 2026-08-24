import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { workspaces } from "@/db/schema/workspaces";

export const workspaceStatuses = pgTable(
  "workspace_statuses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color").notNull().default("#6b7280"),
    displayOrder: integer("display_order").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    // Built-in, protected status (currently just "Draft") — cannot be
    // deleted, archived, or renamed. Always present as the fallback a post
    // is moved to when its actual status is deleted. Distinct from
    // isDefault, which just means "new posts start here" and is freely
    // reassignable.
    isSystem: boolean("is_system").notNull().default(false),
    // Explicit roadmap-visibility flag (Sync-ON mode). ONLY statuses with this
    // set to true become roadmap columns. Intake/internal statuses (Open, Under
    // Review, Closed, Draft…) stay false so they never appear on the roadmap.
    showOnRoadmap: boolean("show_on_roadmap").notNull().default(false),
    // Whether posts with this status appear in the public feedback list/board
    // and are reachable at their public URL — independent of showOnRoadmap, so
    // a status can still show as a roadmap column while being hidden from the
    // public feed. Defaults to true; Completed is seeded/backfilled to false
    // so shipped items don't clutter the public feed. Never affects the admin
    // panel, where every status stays fully visible.
    showOnPublicFeed: boolean("show_on_public_feed").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("workspace_statuses_workspace_slug_unq").on(
      t.workspaceId,
      t.slug
    ),
    index("workspace_statuses_workspace_id_idx").on(t.workspaceId),
    index("workspace_statuses_workspace_order_idx").on(
      t.workspaceId,
      t.displayOrder
    ),
  ]
);
