import { createId } from "@paralleldrive/cuid2";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { posts } from "@/db/schema/posts";
import { workspaces } from "@/db/schema/workspaces";

export const votes = pgTable(
  "votes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    userEmail: text("user_email"),
    userName: text("user_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("votes_post_id_idx").on(t.postId),
    index("votes_user_id_idx").on(t.userId),
    index("votes_workspace_id_idx").on(t.workspaceId),
    index("votes_post_id_user_id_idx").on(t.postId, t.userId),
    index("votes_post_id_user_email_idx").on(t.postId, t.userEmail),
  ]
);
