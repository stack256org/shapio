import { createId } from "@paralleldrive/cuid2";
import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// A live email-ownership challenge for an ACCOUNTLESS Public Portal visitor.
// Unlike Better Auth's own `verification` table (which this deliberately does
// not touch — that one is BA-managed and a successful verify there mints a user
// + session), clearing a row here creates no account: it only proves the
// visitor controls the address, which is then carried in a signed cookie (see
// lib/portal/guest-identity.ts).
//
// Only the SHA-256 of the code is stored, so a database leak never yields a
// usable code. `attemptCount` bounds brute force against the 6-digit space, and
// `lastSentAt` backs the resend cooldown — both live in the row rather than in
// process memory so they survive restarts and hold across multiple instances.
export const portalVerifications = pgTable(
  "portal_verifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One live code per address — requesting again rotates the existing row
    // rather than leaving several codes valid at once.
    uniqueIndex("portal_verifications_email_unq").on(t.email),
  ]
);
