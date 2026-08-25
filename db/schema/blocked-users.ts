import { createId } from "@paralleldrive/cuid2";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { workspaces } from "@/db/schema/workspaces";

export const blockedUsers = pgTable(
  "blocked_users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    userEmail: text("user_email"),
    userName: text("user_name"),
    blockedBy: text("blocked_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("blocked_users_workspace_id_idx").on(t.workspaceId),
    index("blocked_users_user_id_idx").on(t.userId),
    index("blocked_users_user_email_idx").on(t.userEmail),
  ]
);
