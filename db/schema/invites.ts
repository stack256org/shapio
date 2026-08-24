import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { workspaceMemberRole, workspaces } from "@/db/schema/workspaces";

export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    invitedById: text("invited_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    role: workspaceMemberRole("role").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedById: text("revoked_by_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("workspace_invites_workspace_email_idx").on(t.workspaceId, t.email),
    index("workspace_invites_workspace_state_idx").on(
      t.workspaceId,
      t.acceptedAt,
      t.revokedAt
    ),
    index("workspace_invites_email_state_idx").on(
      t.email,
      t.acceptedAt,
      t.revokedAt
    ),
  ]
);

export const workspaceInviteLinks = pgTable(
  "workspace_invite_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    role: workspaceMemberRole("role").notNull(),
    token: text("token").notNull().unique(),
    label: text("label"),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("workspace_invite_links_workspace_active_idx").on(
      t.workspaceId,
      t.isActive
    ),
  ]
);
