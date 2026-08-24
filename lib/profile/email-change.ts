import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { pendingEmailChanges } from "@/db/schema";
import { db } from "@/lib/db";

const EMAIL_CHANGE_EXPIRY_HOURS = 1;

export async function createPendingEmailChange(
  userId: string,
  newEmail: string
): Promise<{ expiresAt: Date; token: string }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + EMAIL_CHANGE_EXPIRY_HOURS * 60 * 60 * 1000
  );

  await db
    .insert(pendingEmailChanges)
    .values({ userId, newEmail, token, expiresAt })
    .onConflictDoUpdate({
      target: pendingEmailChanges.userId,
      set: { newEmail, token, expiresAt, createdAt: new Date() },
    });

  return { token, expiresAt };
}

export async function getPendingEmailChangeByToken(token: string) {
  const [row] = await db
    .select()
    .from(pendingEmailChanges)
    .where(eq(pendingEmailChanges.token, token))
    .limit(1);
  return row ?? null;
}

export async function deletePendingEmailChange(userId: string): Promise<void> {
  await db
    .delete(pendingEmailChanges)
    .where(eq(pendingEmailChanges.userId, userId));
}
