import { createId } from "@paralleldrive/cuid2";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { workspaces } from "@/db/schema/workspaces";

// A signed-in User (or member) following a workspace's public roadmap so they
// can be notified of roadmap updates. Following requires sign-in (Feature 09).
export const roadmapFollowers = pgTable(
  "roadmap_followers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("roadmap_followers_workspace_user_unq").on(
      t.workspaceId,
      t.userId
    ),
    index("roadmap_followers_workspace_idx").on(t.workspaceId),
  ]
);
