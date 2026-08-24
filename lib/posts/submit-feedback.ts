import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { boards, categories, workspaces } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getDefaultCategory } from "@/lib/categories/queries";
import { db } from "@/lib/db";
import { isBlocked } from "@/lib/moderation/queries";
import { enqueueNewPostAlerts } from "@/lib/posts/notify";
import { createPost, generatePostSlug } from "@/lib/posts/queries";
import {
  maxMeaningfulLength,
  minMeaningfulLength,
} from "@/lib/validation/text-length";
import { getWorkspaceStatusBySlug } from "@/lib/workspace-statuses/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

// Business logic shared between createPostAction (Server Action, cookie
// auth, non-embed) and app/api/embed/posts (Route Handler, bearer auth,
// embed widget) — one implementation, two thin auth/response wrappers.
// This function owns everything EXCEPT the initial session lookup (each
// caller's auth mechanism differs) and revalidatePath (Server-Action/RSC
// cache concern with no Route Handler equivalent — callers handle that
// themselves after a successful result).

export const submitFeedbackSchema = z.object({
  boardId: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z
    .string()
    .refine(minMeaningfulLength(3), "Title must be at least 3 characters.")
    .refine(maxMeaningfulLength(150), "Title must be 150 characters or fewer."),
  body: z
    .string()
    .refine(
      maxMeaningfulLength(10_000),
      "Description must be 10,000 characters or fewer."
    )
    .optional(),
  categoryId: z.string().min(1).optional(),
  imageUrl: z.url().optional(),
  status: z.string().min(1).optional(),
  saveAsDraft: z.boolean().optional(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;

export interface FeedbackActor {
  email: string;
  // Null for an accountless Public Portal visitor who has verified their email
  // (lib/portal/guest-identity.ts). The post is then attributed by
  // authorEmail/authorName alone — posts.authorId has always been nullable.
  id: string | null;
  name: string | null;
}

export type SubmitFeedbackResult =
  | {
      data: {
        boardSlug: string;
        isDraft: boolean;
        isPending: boolean;
        postId: string;
        postSlug: string;
        workspaceSlug: string | null;
      };
      ok: true;
    }
  | { code?: string; error: string; field?: string; ok: false };

export async function submitFeedback(
  actor: FeedbackActor,
  rawInput: unknown
): Promise<SubmitFeedbackResult> {
  const parsed = submitFeedbackSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string | undefined,
    };
  }
  const input = parsed.data;

  // Verify the board belongs to the workspace and check visibility.
  // Any signed-in User may submit on a public, non-archived board; private
  // or archived boards remain restricted to workspace members.
  const [boardRow] = await db
    .select({
      slug: boards.slug,
      workspaceId: boards.workspaceId,
      isPublic: boards.isPublic,
      isArchived: boards.isArchived,
    })
    .from(boards)
    .where(eq(boards.id, input.boardId))
    .limit(1);

  if (!boardRow || boardRow.workspaceId !== input.workspaceId) {
    return { ok: false, error: "Board not found." };
  }
  if (boardRow.isArchived) {
    return {
      ok: false,
      error: "This board is no longer accepting feedback.",
    };
  }

  // A guest has no account and therefore can never be a member — which is
  // exactly what confines them to public, non-archived boards below.
  const actorMember = actor.id
    ? await getWorkspaceMember(input.workspaceId, actor.id)
    : null;
  if (!boardRow.isPublic && !actorMember) {
    return { ok: false, error: "This board is private." };
  }

  const blocked = await isBlocked(input.workspaceId, {
    userId: actor.id,
    userEmail: actor.email,
  });
  if (blocked) {
    return {
      ok: false,
      error: "You are not allowed to post in this workspace.",
      code: "BLOCKED",
    };
  }

  const [workspaceRow] = await db
    .select({
      slug: workspaces.slug,
      moderationMode: workspaces.moderationMode,
      spamKeywords: workspaces.spamKeywords,
    })
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .limit(1);

  const spamKeywords = workspaceRow?.spamKeywords ?? [];
  const titleLower = input.title.toLowerCase();
  const bodyLower = (input.body ?? "").toLowerCase();
  const isSpam = spamKeywords.some(
    (kw) => titleLower.includes(kw) || bodyLower.includes(kw)
  );

  const moderationMode = workspaceRow?.moderationMode ?? "off";
  const isApproved =
    !isSpam &&
    moderationMode !== "manual" &&
    (moderationMode !== "auto" || !isSpam);

  // Every post always has a category. Validate an explicit choice belongs to
  // this workspace (cross-tenant safety); otherwise fall back to the
  // workspace's default category rather than leaving it unset.
  let categoryId: string | null = null;
  if (input.categoryId) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, input.categoryId),
          eq(categories.workspaceId, input.workspaceId)
        )
      )
      .limit(1);
    if (!category) {
      return { ok: false, error: "Invalid category.", field: "categoryId" };
    }
    categoryId = category.id;
  } else {
    const defaultCategory = await getDefaultCategory(input.workspaceId);
    categoryId = defaultCategory?.id ?? null;
  }

  // Setting an initial status at creation is a triage action, same as
  // changing status afterward — restricted to workspace members. A public
  // User's request can never set this, even if passed.
  let status: string | undefined;
  if (input.status && actorMember) {
    const targetStatus = await getWorkspaceStatusBySlug(
      input.workspaceId,
      input.status
    );
    if (!targetStatus) {
      return { ok: false, error: "Invalid status.", field: "status" };
    }
    status = targetStatus.slug;
  }

  // Saving as a draft is a workspace-member (triage) capability — a public
  // User's submission can never be a draft, even if the flag is forged.
  const isDraft = Boolean(input.saveAsDraft) && Boolean(actorMember);

  const slug = await generatePostSlug(input.boardId, input.title);

  const post = await createPost({
    boardId: input.boardId,
    workspaceId: input.workspaceId,
    slug,
    title: input.title,
    body: input.body,
    categoryId,
    authorId: actor.id,
    authorName: actor.name,
    authorEmail: actor.email,
    imageUrl: input.imageUrl,
    status,
    isApproved,
    isDraft,
  });

  audit({
    workspaceId: input.workspaceId,
    action: "post.created",
    actorId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name,
    entityType: "post",
    entityId: post.id,
    description: isDraft
      ? `Saved draft: ${input.title}`
      : `Created post: ${input.title}`,
    metadata: {
      boardId: input.boardId,
      workspaceId: input.workspaceId,
      title: input.title,
      slug,
      isApproved,
      isDraft,
    },
  });

  // Only notify admins when the post is immediately visible — never for a
  // draft (that side-effect runs at publish time instead).
  if (post.isApproved && !isDraft) {
    enqueueNewPostAlerts({
      postId: post.id,
      postTitle: input.title,
      postBody: input.body ?? null,
      postSlug: slug,
      boardId: input.boardId,
      workspaceId: input.workspaceId,
      authorId: actor.id,
      authorName: actor.name ?? actor.email,
    }).catch((err) =>
      console.error("[posts] failed to enqueue new-post alerts", err)
    );
  }

  return {
    ok: true,
    data: {
      postId: post.id,
      postSlug: post.slug,
      isPending: !post.isApproved,
      isDraft: post.isDraft,
      workspaceSlug: workspaceRow?.slug ?? null,
      boardSlug: boardRow.slug,
    },
  };
}
