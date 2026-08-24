import { createId } from "@paralleldrive/cuid2";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { posts } from "@/db/schema/posts";

/**
 * Append-only trail of every status transition on a post — who changed it,
 * from/to, and an optional note. Shown on the post detail page.
 */
export const postStatusChanges = pgTable(
  "post_status_changes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    changedBy: text("changed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    changedByName: text("changed_by_name"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("post_status_changes_post_id_idx").on(t.postId, t.createdAt)]
);
