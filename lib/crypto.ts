import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { env } from "@/lib/env";

/**
 * Encrypts secrets stored in the database (SMTP password, OAuth client
 * secret, storage/webhook keys — see lib/integration-settings.ts). Keyed off
 * APP_SECRET (sha256-derived to 32 bytes) rather than a separate managed
 * secret — APP_SECRET is already a required boot-time value, so there's
 * nothing new for an operator to generate or rotate.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function getKey(): Buffer {
  return createHash("sha256").update(env.APP_SECRET).digest();
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format.");
  }
  const [ivHex, tagHex, dataHex] = parts as [string, string, string];
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8"
  );
}
