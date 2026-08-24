import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";

export const workspaceMemberRole = pgEnum("workspace_member_role", [
  "owner",
  "admin",
  "member",
]);

export const moderationMode = pgEnum("moderation_mode", [
  "off",
  "auto",
  "manual",
]);

export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    ownerId: text("owner_id").references(() => user.id, {
      onDelete: "set null",
    }),
    roadmapPublic: boolean("roadmap_public").notNull().default(false),
    // When true (default) the roadmap columns are derived from feedback statuses
    // and are read-only. When false the roadmap becomes independent: manual
    // items in workspace-defined roadmap_statuses columns, drag-and-drop, etc.
    roadmapSyncEnabled: boolean("roadmap_sync_enabled")
      .notNull()
      .default(true),
    changelogPublic: boolean("changelog_public").notNull().default(false),
    moderationMode: moderationMode("moderation_mode").notNull().default("off"),
    commentModeration: boolean("comment_moderation").notNull().default(false),
    spamKeywords: text("spam_keywords")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isSuspended: boolean("is_suspended").notNull().default(false),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedBy: text("suspended_by"),
    // Set only for the single workspace created by the first-run `/setup`
    // wizard (the instance's very first workspace) — cleared once its owner
    // configures SMTP and clicks Finish/Skip on the integrations step.
    // Workspaces created through the normal onboarding flow never set this.
    requiresIntegrationSetup: boolean("requires_integration_setup")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("workspaces_owner_id_idx").on(t.ownerId),
    index("workspaces_created_at_idx").on(t.createdAt),
  ]
);

export const workspaceMembers = pgTable(
  "workspace_members",
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
    role: workspaceMemberRole("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("workspace_members_workspace_user_unq").on(
      t.workspaceId,
      t.userId
    ),
    index("workspace_members_user_id_joined_at_idx").on(t.userId, t.joinedAt),
    index("workspace_members_workspace_id_role_idx").on(t.workspaceId, t.role),
  ]
);
