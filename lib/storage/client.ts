import { S3Client } from "@aws-sdk/client-s3";
import type { StorageS3Settings } from "@/lib/integration-settings";

// Built fresh per call (never cached) so a storage config change made via
// Admin → Integrations applies to the very next upload, with no restart —
// constructing an S3Client is local/synchronous, no network round trip.
export function createS3Client(settings: StorageS3Settings): S3Client {
  return new S3Client({
    region: settings.region,
    endpoint: settings.endpoint,
    forcePathStyle: Boolean(settings.endpoint),
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
  });
}
