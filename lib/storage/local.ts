import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStorageLocalDir } from "@/lib/integration-settings";
import { adminBaseUrl } from "@/lib/urls";

// Local storage root. Next.js serves everything under public/ directly off
// disk at request time (no `output: "standalone"` bundling here), so writes
// here are immediately reachable at /uploads/<key> — no separate serving
// route needed. Fine for a single-server/self-hosted deployment; configure
// S3/R2 storage (Admin → Integrations or STORAGE_S3_*) for anything
// multi-instance. Read fresh per call — see lib/integration-settings.ts.

function publicUrlBase(): string {
  // Uploaded assets (avatars, post/changelog images) are served off disk by the
  // same app on any host; store them under the stable admin host. They are not
  // cookie-gated, so they load fine when displayed on the portal host too.
  return `${adminBaseUrl()}/uploads`;
}

export async function uploadFileLocal(
  key: string,
  buffer: Buffer
): Promise<string> {
  const localDir = await getStorageLocalDir();
  const filePath = path.join(localDir, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return `${publicUrlBase()}/${key}`;
}

export async function deleteFileLocal(url: string): Promise<void> {
  const prefix = `${publicUrlBase()}/`;
  if (!url.startsWith(prefix)) {
    return;
  }
  const key = url.slice(prefix.length);
  const localDir = await getStorageLocalDir();
  await unlink(path.join(localDir, key)).catch((err) => {
    if (err.code !== "ENOENT") {
      throw err;
    }
  });
}
