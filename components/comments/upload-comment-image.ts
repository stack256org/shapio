import { toast } from "sonner";
import { uploadPostImageAction } from "@/app/actions/posts";

// Client-side guardrails (the server action re-validates + requires a session).
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

// Validates and uploads a single comment image, reusing the existing post-image
// upload action/storage. Returns the hosted URL, or null (after a toast) on any
// validation/upload failure so callers can fail gracefully.
export async function uploadCommentImage(file: File): Promise<string | null> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    toast.error("Use a PNG, JPEG, WEBP, or GIF image.");
    return null;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    toast.error("Image must be 4MB or smaller.");
    return null;
  }

  const form = new FormData();
  form.set("image", file);
  const result = await uploadPostImageAction(form);
  if (!result.success) {
    toast.error(result.error);
    return null;
  }
  return result.data.url;
}
