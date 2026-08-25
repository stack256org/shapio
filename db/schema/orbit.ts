import { createId } from "@paralleldrive/cuid2";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const featureFlags = pgTable("feature_flags", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  key: text("key").notNull().unique(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const platformSettings = pgTable("platform_settings", {
  id: integer("id").primaryKey().default(1),
  signupEnabled: boolean("signup_enabled").notNull().default(true),
  maxWorkspacesPerUser: integer("max_workspaces_per_user").notNull().default(5),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  maintenanceMessage: text("maintenance_message"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
