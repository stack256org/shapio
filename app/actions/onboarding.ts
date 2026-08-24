"use server";

import { eq } from "drizzle-orm";
import { createWorkspaceAction } from "@/app/actions/workspace";
import { updateWorkspaceSettingsAction } from "@/app/actions/workspace-settings";
import { user } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { countCharacters } from "@/lib/text-metrics";
import { getWorkspaceBySlug } from "@/lib/workspaces/queries";
import { generateUniqueSlug } from "@/lib/workspaces/slug";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

export type OnboardingUsage = "portal" | "widget" | null;

// The wizard's single write step — everything Steps 1–3 collected lands here
// at once. Deliberately composed from the SAME actions the rest of the app
// already uses (createWorkspaceAction, updateWorkspaceSettingsAction) rather
// than reimplementing workspace creation or visibility toggling: this stays
// in lockstep with those code paths (validation, audit trail, demo-content
// seeding) for free, and never diverges from them.
//
// There's no separate "onboarding completed" flag — this app's existing
// completion signal is "does this user have a workspace yet" (see
// app/post-auth/page.tsx and app/onboarding/page.tsx, both already routing on
// getFirstUserWorkspace). Every path through this action — including Skip —
// ends in a created workspace, so that signal keeps working unchanged; adding
// a second, parallel flag would just create a way for the two to disagree.
export async function completeOnboardingAction(input: {
  description?: string;
  name?: string;
  slug?: string;
  usage: OnboardingUsage;
  workspaceName: string;
}): Promise<ActionResult<{ slug: string; usage: OnboardingUsage }>> {
  const session = await requireSession();

  const trimmedName = input.name?.trim();
  if (trimmedName && trimmedName !== session.user.name) {
    if (countCharacters(trimmedName) > 100) {
      return {
        success: false,
        error: "Name must be 100 characters or fewer.",
        field: "name",
      };
    }
    await db
      .update(user)
      .set({ name: trimmedName, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));
    audit({
      action: "profile.name_updated",
      actorEmail: session.user.email,
      actorId: session.user.id,
      description: "Updated profile name (onboarding)",
      entityId: session.user.id,
      entityType: "user",
      metadata: { name: trimmedName },
    });
  }

  const workspaceName = input.workspaceName.trim() || "My Workspace";
  // Step 3's slug field is optional in this action (not just in the UI) so
  // Skip can go straight from a bare workspace name to a guaranteed-unique
  // slug without the client having to fake a live availability check for a
  // field the visible flow always resolves interactively.
  const slug = input.slug?.trim() || (await generateUniqueSlug(workspaceName));

  const created = await createWorkspaceAction({
    name: workspaceName,
    slug,
    description: input.description,
  });
  if (!created.success) {
    return created;
  }

  if (input.usage === "portal") {
    const workspace = await getWorkspaceBySlug(created.data.slug);
    if (workspace) {
      await updateWorkspaceSettingsAction({
        workspaceId: workspace.id,
        roadmapPublic: true,
        changelogPublic: true,
      });
    }
  }

  return {
    success: true,
    data: { slug: created.data.slug, usage: input.usage },
  };
}
