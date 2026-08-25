import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { posts } from "@/db/schema/posts";
import { workspaces } from "@/db/schema/workspaces";

export const changelogEntries = pgTable(
  "changelog_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    coverImageUrl: text("cover_image_url"),
    label: text("label").notNull().default("new_feature"),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("changelog_entries_workspace_id_idx").on(t.workspaceId),
    index("changelog_entries_workspace_published_idx").on(
      t.workspaceId,
      t.isPublished,
      t.publishedAt
    ),
    index("changelog_entries_created_by_idx").on(t.createdBy),
  ]
);

export const changelogPosts = pgTable(
  "changelog_posts",
  {
    changelogEntryId: text("changelog_entry_id")
      .notNull()
      .references(() => changelogEntries.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.changelogEntryId, t.postId] }),
    index("changelog_posts_post_id_idx").on(t.postId),
  ]
);
