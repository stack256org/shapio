import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { workspaces } from "@/db/schema/workspaces";

export const NOTIFICATION_TYPES = [
  "new_post",
  "status_change",
  "new_comment",
  "reply",
  "pending_comment",
  "changelog_published",
  "invite_accepted",
  "member_removed",
  "assignment",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").$type<NotificationType>().notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_user_id_is_read_idx").on(t.userId, t.isRead),
    index("notifications_user_id_created_at_idx").on(t.userId, t.createdAt),
    index("notifications_workspace_id_idx").on(t.workspaceId),
  ]
);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  emailStatusChange: boolean("email_status_change").notNull().default(true),
  emailNewComment: boolean("email_new_comment").notNull().default(true),
  emailChangelog: boolean("email_changelog").notNull().default(true),
  inAppStatusChange: boolean("in_app_status_change").notNull().default(true),
  inAppNewComment: boolean("in_app_new_comment").notNull().default(true),
  inAppChangelog: boolean("in_app_changelog").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
