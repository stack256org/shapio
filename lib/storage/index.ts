import { deleteFileLocal, uploadFileLocal } from "@/lib/storage/local";
import { deleteFileS3, isS3Configured, uploadFileS3 } from "@/lib/storage/s3";

/**
 * Uploads a file under the given key (e.g. "avatars/user-123.png") and
 * returns its public URL. Uses S3/R2 when STORAGE_S3_* is configured,
 * otherwise falls back to local disk storage under public/uploads — fine
 * for a single-server/self-hosted deployment, no setup required.
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  return (await isS3Configured())
    ? uploadFileS3(key, buffer, contentType)
    : uploadFileLocal(key, buffer);
}

/** Deletes a previously uploaded file by its public URL. */
export async function deleteFile(url: string): Promise<void> {
  return (await isS3Configured()) ? deleteFileS3(url) : deleteFileLocal(url);
}
