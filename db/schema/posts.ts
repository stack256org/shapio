import { createId } from "@paralleldrive/cuid2";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { boards } from "@/db/schema/boards";
import { categories } from "@/db/schema/categories";
import { workspaces } from "@/db/schema/workspaces";

export const posts = pgTable(
  "posts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    status: text("status").notNull().default("open"),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name"),
    authorEmail: text("author_email").notNull(),
    imageUrl: text("image_url"),
    assignedToId: text("assigned_to_id").references(() => user.id, {
      onDelete: "set null",
    }),
    upvotes: integer("upvotes").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    isPinned: boolean("is_pinned").notNull().default(false),
    isLocked: boolean("is_locked").notNull().default(false),
    isApproved: boolean("is_approved").notNull().default(true),
    // Unpublished draft: saved by a workspace member but never surfaced on any
    // public/output surface (portal, roadmap, changelog, public API) and never
    // fires new-post notifications/webhooks until it is published.
    isDraft: boolean("is_draft").notNull().default(false),
    // Set when this post has been merged into another; the merged post is locked
    // and hidden from active lists (it points to its target).
    mergedIntoId: text("merged_into_id").references(
      (): AnyPgColumn => posts.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("posts_board_id_slug_unq").on(t.boardId, t.slug),
    index("posts_board_id_created_at_idx").on(t.boardId, t.createdAt),
    index("posts_board_id_upvotes_idx").on(t.boardId, t.upvotes),
    index("posts_board_id_status_idx").on(t.boardId, t.status),
    index("posts_author_id_idx").on(t.authorId),
    index("posts_assigned_to_id_idx").on(t.assignedToId),
    index("posts_workspace_id_created_at_idx").on(t.workspaceId, t.createdAt),
    index("posts_category_id_idx").on(t.categoryId),
    index("posts_workspace_id_is_draft_idx").on(t.workspaceId, t.isDraft),
  ]
);
