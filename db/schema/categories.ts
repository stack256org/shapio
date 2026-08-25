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

export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    color: text("color").notNull().default("#6366f1"),
    displayOrder: integer("display_order").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    // Every post always has a category now — this is the one auto-assigned
    // when a post is created without an explicit choice, and the one
    // deletion falls back to (see lib/categories/delete.ts). Exactly one
    // per workspace; mirrors workspace_statuses' isDefault.
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("categories_workspace_slug_unq").on(t.workspaceId, t.slug),
    uniqueIndex("categories_workspace_name_unq").on(t.workspaceId, t.name),
    index("categories_workspace_id_idx").on(t.workspaceId),
    index("categories_workspace_order_idx").on(t.workspaceId, t.displayOrder),
  ]
);
