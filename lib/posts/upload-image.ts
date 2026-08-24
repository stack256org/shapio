import { createHash } from "node:crypto";
import { uploadFile } from "@/lib/storage";

// Business logic shared between uploadPostImageAction (Server Action) and
// app/api/embed/posts/upload-image (Route Handler) — see submit-feedback.ts
// for why this split exists. No environment-specific code here at all, so
// this is a near-verbatim extraction.

const MAX_POST_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_POST_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export type UploadPostImageResult =
  | { data: { url: string }; ok: true }
  | { error: string; ok: false };

/**
 * Opaque, stable filename namespace for an accountless guest. Uploaded image
 * URLs are publicly readable, so the verified email must never appear in the
 * path — a truncated digest keeps uploads grouped per person without
 * disclosing who that person is.
 */
export function guestUploadKey(email: string): string {
  return `g${createHash("sha256").update(email).digest("hex").slice(0, 16)}`;
}

/**
 * `ownerKey` only namespaces the stored filename. Callers pass a user id for an
 * account; for an accountless Public Portal guest they must pass an opaque
 * derived key (see guestUploadKey) rather than the raw email — uploaded image
 * URLs are public, so an address in the path would be exposed to anyone who
 * views the post.
 */
export async function uploadPostImage(
  ownerKey: string,
  file: File | null
): Promise<UploadPostImageResult> {
  if (!file || file.size === 0) {
    return { ok: false, error: "Choose an image to upload." };
  }
  if (!ALLOWED_POST_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: "Use a PNG, JPEG, WEBP, or GIF image." };
  }
  if (file.size > MAX_POST_IMAGE_BYTES) {
    return { ok: false, error: "Image must be 4MB or smaller." };
  }

  const extension = file.type.split("/")[1];
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadFile(
    `posts/${ownerKey}-${Date.now()}.${extension}`,
    buffer,
    file.type
  );

  return { ok: true, data: { url } };
}
