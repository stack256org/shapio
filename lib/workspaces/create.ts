import { createId } from "@paralleldrive/cuid2";
import {
  DEFAULT_BOARD_DESCRIPTION,
  DEFAULT_BOARD_NAME,
  DEFAULT_BOARD_SLUG,
  WORKSPACE_OWNER,
} from "@/config/platform";
import { boards, workspaceMembers, workspaces } from "@/db/schema";
import { audit } from "@/lib/audit";
import { seedDefaultCategories } from "@/lib/categories/create";
import { db } from "@/lib/db";
import { seedDefaultStatuses } from "@/lib/workspace-statuses/create";

export interface CreateWorkspaceInput {
  description?: string | null;
  name: string;
  ownerEmail: string;
  ownerId: string;
  requiresIntegrationSetup?: boolean;
  slug: string;
}

export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<string> {
  const workspaceId = createId();

  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({
      id: workspaceId,
      slug: input.slug,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      ownerId: input.ownerId,
      requiresIntegrationSetup: input.requiresIntegrationSetup ?? false,
    });

    await tx.insert(workspaceMembers).values({
      workspaceId,
      userId: input.ownerId,
      role: WORKSPACE_OWNER,
    });

    await tx.insert(boards).values({
      workspaceId,
      slug: DEFAULT_BOARD_SLUG,
      name: DEFAULT_BOARD_NAME,
      description: DEFAULT_BOARD_DESCRIPTION,
      createdBy: input.ownerId,
    });

    await seedDefaultStatuses(workspaceId, tx);
    await seedDefaultCategories(workspaceId, tx);
  });

  audit({
    action: "workspace.created",
    actorId: input.ownerId,
    actorEmail: input.ownerEmail,
    description: `Workspace created: ${input.name}`,
    entityType: "workspace",
    entityId: workspaceId,
    metadata: { name: input.name, slug: input.slug },
  });

  return workspaceId;
}
