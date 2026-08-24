import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { adminBaseUrl } from "@/lib/urls";

// Stateless, per-user unsubscribe tokens. The token carries the user id and an
// HMAC signature over it (keyed by APP_SECRET), so the unsubscribe endpoint can
// verify the link without a database lookup or a logged-in session. No schema
// change is required, and tokens cannot be forged or replayed for another user.

const SEPARATOR = ".";

function sign(userId: string): string {
  return createHmac("sha256", env.APP_SECRET)
    .update(userId)
    .digest("base64url");
}

export function createUnsubscribeToken(userId: string): string {
  const encodedId = Buffer.from(userId, "utf8").toString("base64url");
  return `${encodedId}${SEPARATOR}${sign(userId)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [encodedId, signature] = token.split(SEPARATOR);
  if (!encodedId || !signature) {
    return null;
  }

  let userId: string;
  try {
    userId = Buffer.from(encodedId, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!userId) {
    return null;
  }

  const expected = Buffer.from(sign(userId));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length) {
    return null;
  }
  return timingSafeEqual(expected, provided) ? userId : null;
}

export function buildUnsubscribeUrl(userId: string): string {
  const token = createUnsubscribeToken(userId);
  // Token-based (no session), works on any host; use the stable admin host.
  return `${adminBaseUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}
