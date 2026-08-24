import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { changelogLabels } from "@/db/schema";
import { db } from "@/lib/db";

export interface ChangelogLabelRow {
  color: string;
  id: string;
  name: string;
}

const DEFAULT_LABEL_COLOR = "#6b7280";

export async function listChangelogLabels(
  workspaceId: string
): Promise<ChangelogLabelRow[]> {
  return db
    .select({
      id: changelogLabels.id,
      name: changelogLabels.name,
      color: changelogLabels.color,
    })
    .from(changelogLabels)
    .where(eq(changelogLabels.workspaceId, workspaceId))
    .orderBy(asc(changelogLabels.createdAt));
}

// Case-insensitive lookup so we never create/rename into a duplicate.
async function findByName(
  workspaceId: string,
  name: string,
  excludeId?: string
) {
  const rows = await db
    .select({ id: changelogLabels.id, name: changelogLabels.name })
    .from(changelogLabels)
    .where(
      and(
        eq(changelogLabels.workspaceId, workspaceId),
        sql`lower(${changelogLabels.name}) = ${name.toLowerCase()}`,
        excludeId ? ne(changelogLabels.id, excludeId) : undefined
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export class ChangelogLabelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChangelogLabelError";
  }
}

export async function createChangelogLabel(
  workspaceId: string,
  input: { name: string; color?: string }
): Promise<ChangelogLabelRow> {
  const name = input.name.trim();
  if (await findByName(workspaceId, name)) {
    throw new ChangelogLabelError("A label with this name already exists.");
  }
  const [row] = await db
    .insert(changelogLabels)
    .values({
      id: createId(),
      workspaceId,
      name,
      color: input.color ?? DEFAULT_LABEL_COLOR,
    })
    .returning({
      id: changelogLabels.id,
      name: changelogLabels.name,
      color: changelogLabels.color,
    });
  return row!;
}

export async function updateChangelogLabel(
  labelId: string,
  workspaceId: string,
  input: { name?: string; color?: string }
): Promise<ChangelogLabelRow> {
  const name = input.name?.trim();
  if (name && (await findByName(workspaceId, name, labelId))) {
    throw new ChangelogLabelError("A label with this name already exists.");
  }
  const [row] = await db
    .update(changelogLabels)
    .set({
      ...(name ? { name } : {}),
      ...(input.color ? { color: input.color } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(changelogLabels.id, labelId),
        eq(changelogLabels.workspaceId, workspaceId)
      )
    )
    .returning({
      id: changelogLabels.id,
      name: changelogLabels.name,
      color: changelogLabels.color,
    });
  if (!row) {
    throw new ChangelogLabelError("Label not found.");
  }
  return row;
}

export async function deleteChangelogLabel(
  labelId: string,
  workspaceId: string
): Promise<void> {
  await db
    .delete(changelogLabels)
    .where(
      and(
        eq(changelogLabels.id, labelId),
        eq(changelogLabels.workspaceId, workspaceId)
      )
    );
}
