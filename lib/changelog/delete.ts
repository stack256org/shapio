import { and, eq } from "drizzle-orm";
import { changelogEntries } from "@/db/schema";
import { db } from "@/lib/db";

export async function deleteChangelogEntry(
  entryId: string,
  workspaceId: string
) {
  const [entry] = await db
    .select({ id: changelogEntries.id })
    .from(changelogEntries)
    .where(
      and(
        eq(changelogEntries.id, entryId),
        eq(changelogEntries.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!entry) {
    throw new Error("Changelog entry not found.");
  }

  // changelog_posts deleted via CASCADE
  await db.delete(changelogEntries).where(eq(changelogEntries.id, entryId));
}
