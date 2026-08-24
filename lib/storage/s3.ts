import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  getStorageS3Settings,
  isStorageS3Configured,
} from "@/lib/integration-settings";
import { createS3Client } from "@/lib/storage/client";

/** True once every field needed to talk to S3/R2 is set (DB row or .env). */
export async function isS3Configured(): Promise<boolean> {
  return isStorageS3Configured();
}

export async function uploadFileS3(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const settings = await getStorageS3Settings();
  if (!settings) {
    throw new Error("S3 storage is not configured.");
  }

  await createS3Client(settings).send(
    new PutObjectCommand({
      Bucket: settings.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${settings.publicUrlBase}/${key}`;
}

export async function deleteFileS3(url: string): Promise<void> {
  const settings = await getStorageS3Settings();
  if (!settings) {
    return;
  }

  const prefix = `${settings.publicUrlBase}/`;
  if (!url.startsWith(prefix)) {
    return;
  }
  const key = url.slice(prefix.length);

  await createS3Client(settings).send(
    new DeleteObjectCommand({
      Bucket: settings.bucket,
      Key: key,
    })
  );
}
