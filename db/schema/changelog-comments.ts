import { createId } from "@paralleldrive/cuid2";
import {
  type AnyPgColumn,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { changelogEntries } from "@/db/schema/changelog";

export const changelogComments = pgTable(
  "changelog_comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    changelogEntryId: text("changelog_entry_id")
      .notNull()
      .references(() => changelogEntries.id, { onDelete: "cascade" }),
    // Self-reference for one-level threaded replies (mirrors feedback comments).
    // Null = top-level comment. Cascade so deleting a parent removes its replies.
    parentId: text("parent_id").references(
      (): AnyPgColumn => changelogComments.id,
      { onDelete: "cascade" }
    ),
    body: text("body").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    // Comment moderation parity with feedback: when a workspace enables comment
    // moderation, new comments start unapproved and are hidden until approved.
    isApproved: boolean("is_approved").notNull().default(true),
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name"),
    authorAvatar: text("author_avatar"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("changelog_comments_entry_id_idx").on(t.changelogEntryId),
    index("changelog_comments_author_id_idx").on(t.authorId),
    index("changelog_comments_parent_id_idx").on(t.parentId),
  ]
);

// Per-comment emoji reactions (distinct from entry-level changelogEntryReactions
// below). Mirrors comment_reactions for feedback so the shared reactions UI works.
export const changelogCommentReactions = pgTable(
  "changelog_comment_reactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    commentId: text("comment_id")
      .notNull()
      .references(() => changelogComments.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("changelog_comment_reactions_comment_id_idx").on(t.commentId),
    index("changelog_comment_reactions_user_id_idx").on(t.userId),
  ]
);

export const changelogEntryReactions = pgTable(
  "changelog_entry_reactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    changelogEntryId: text("changelog_entry_id")
      .notNull()
      .references(() => changelogEntries.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("changelog_entry_reactions_entry_id_idx").on(t.changelogEntryId),
    index("changelog_entry_reactions_user_id_idx").on(t.userId),
  ]
);
