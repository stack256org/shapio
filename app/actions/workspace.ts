"use server";

import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { MAX_WORKSPACES_PER_USER, RESERVED_SLUGS } from "@/config/platform";
import { workspaceMembers } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  maxMeaningfulLength,
  minMeaningfulLength,
} from "@/lib/validation/text-length";
import { createWorkspace } from "@/lib/workspaces/create";
import { seedWorkspaceDemoContent } from "@/lib/workspaces/seed-demo-content";
import {
  isSlugAvailable,
  isSlugReserved,
  validateSlugFormat,
} from "@/lib/workspaces/slug";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .refine(minMeaningfulLength(2), "Name must be at least 2 characters.")
    .refine(maxMeaningfulLength(64), "Name must be 64 characters or fewer."),
  slug: z.string().min(2).max(48),
  description: z
    .string()
    .refine(
      maxMeaningfulLength(300),
      "Description must be 300 characters or fewer."
    )
    .optional(),
});

export async function createWorkspaceAction(formData: {
  name: string;
  slug: string;
  description?: string;
  requiresIntegrationSetup?: boolean;
}): Promise<ActionResult<{ slug: string }>> {
  const session = await requireSession();

  const parsed = createWorkspaceSchema.safeParse(formData);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string | undefined,
    };
  }

  const { name, slug, description } = parsed.data;

  const slugError = validateSlugFormat(slug);
  if (slugError) {
    return { success: false, error: slugError, field: "slug" };
  }

  if (isSlugReserved(slug)) {
    return { success: false, error: "This URL is reserved.", field: "slug" };
  }

  const available = await isSlugAvailable(slug);
  if (!available) {
    return {
      success: false,
      error: "This URL is already taken.",
      field: "slug",
    };
  }

  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, session.user.id));

  if (memberCount >= MAX_WORKSPACES_PER_USER) {
    return {
      success: false,
      error: `You can be a member of at most ${MAX_WORKSPACES_PER_USER} workspaces.`,
    };
  }

  const workspaceId = await createWorkspace({
    name: name.trim(),
    slug,
    description: description || null,
    ownerId: session.user.id,
    ownerEmail: session.user.email,
    requiresIntegrationSetup: formData.requiresIntegrationSetup ?? false,
  });

  // Best-effort: a brand-new workspace ships with one example post so the
  // board isn't empty on first visit. Never let a seeding failure block
  // workspace creation itself.
  seedWorkspaceDemoContent(workspaceId).catch((err) =>
    console.error("[workspace] failed to seed demo content", err)
  );

  return { success: true, data: { slug } };
}

export async function checkSlugAction(
  slug: string
): Promise<{ available: boolean; error?: string }> {
  if (!slug) {
    return { available: false };
  }

  const slugError = validateSlugFormat(slug);
  if (slugError) {
    return { available: false, error: slugError };
  }

  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return { available: false, error: "This URL is reserved." };
  }

  const available = await isSlugAvailable(slug);
  return {
    available,
    error: available ? undefined : "This URL is already taken.",
  };
}
