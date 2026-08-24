import { createId } from "@paralleldrive/cuid2";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { workspaces } from "@/db/schema/workspaces";

// User-managed custom changelog labels (workspace-scoped). The five built-in
// labels (CHANGELOG_LABELS constant) are system defaults and are NOT stored
// here — this table holds only labels an admin creates, so they persist and can
// be renamed/deleted independently of the entries that use them.
export const changelogLabels = pgTable(
  "changelog_labels",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#6b7280"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("changelog_labels_workspace_name_unq").on(
      t.workspaceId,
      t.name
    ),
    index("changelog_labels_workspace_id_idx").on(t.workspaceId),
  ]
);
