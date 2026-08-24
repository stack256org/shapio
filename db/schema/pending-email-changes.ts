import { createId } from "@paralleldrive/cuid2";
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";

// A requested-but-unconfirmed email change. The account's real `user.email`
// only updates once the link mailed to `newEmail` is clicked — this is what
// actually proves ownership of the new address (self-reported email changes
// alone must never be trusted for anything security-sensitive, e.g. matching
// workspace invites by email).
export const pendingEmailChanges = pgTable(
  "pending_email_changes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    newEmail: text("new_email").notNull(),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("pending_email_changes_token_unq").on(t.token),
    // One pending request per user — a new request replaces any prior one.
    uniqueIndex("pending_email_changes_user_id_unq").on(t.userId),
  ]
);
