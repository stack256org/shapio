import { createId } from "@paralleldrive/cuid2";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { comments } from "@/db/schema/comments";

export const commentReactions = pgTable(
  "comment_reactions",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    commentId: text("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("comment_reactions_comment_id_idx").on(t.commentId),
    index("comment_reactions_user_id_idx").on(t.userId),
  ]
);
