import { createId } from "@paralleldrive/cuid2";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { workspaces } from "@/db/schema/workspaces";

// Workspace-specific roadmap columns used only when "Sync Roadmap from Feedback"
// is OFF (manual mode). When Sync is ON the roadmap columns are derived from the
// feedback statuses (workspace_statuses) instead and this table is unused.
export const roadmapStatuses = pgTable(
  "roadmap_statuses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#6b7280"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("roadmap_statuses_workspace_id_idx").on(t.workspaceId),
    index("roadmap_statuses_workspace_order_idx").on(
      t.workspaceId,
      t.displayOrder
    ),
  ]
);
