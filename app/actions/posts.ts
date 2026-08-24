"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { boards, user, votes, workspaces } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications/create";
import { getPortalActor } from "@/lib/portal/guest-identity";
import { mergePost } from "@/lib/posts/merge";
import { enqueueNewPostAlerts } from "@/lib/posts/notify";
import {
  approvePost,
  assignPost,
  createPost,
  deletePost,
  generatePostSlug,
  getPost,
  publishPost,
  recordStatusChange,
  searchPostsForMerge,
  setPinned,
  unapprovePost,
  unpublishPost,
  updatePost,
  updatePostStatus,
} from "@/lib/posts/queries";
import { submitFeedback } from "@/lib/posts/submit-feedback";
import { UnmergeError, unmergePost } from "@/lib/posts/unmerge";
import { guestUploadKey, uploadPostImage } from "@/lib/posts/upload-image";
import {
  maxMeaningfulLength,
  minMeaningfulLength,
} from "@/lib/validation/text-length";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";
import { getWorkspaceStatusBySlug } from "@/lib/workspace-statuses/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string; code?: string };

// ─── Create Post ──────────────────────────────────────────────────────────────

export async function createPostAction(input: {
  boardId: string;
  workspaceId: string;
  title: string;
  body?: string;
  categoryId?: string;
  imageUrl?: string;
  status?: string;
  saveAsDraft?: boolean;
}): Promise<
  ActionResult<{
    isPending: boolean;
    isDraft: boolean;
    postId: string;
    postSlug: string;
  }>
> {
  // Resolves a signed-in account OR an accountless Public Portal visitor who
  // has verified their email (actor.id is null for the latter). Never a
  // redirect: this is called from the embed widget's NewPostForm and from the
  // portal form, where a stale/missing identity must surface as a normal error
  // the caller can react to by reopening the in-place prompt, not a
  // server-triggered navigation to /signin.
  const actor = await getPortalActor();
  if (!actor) {
    return {
      success: false,
      error: "Verify your email to post feedback.",
      code: "UNAUTHENTICATED",
    };
  }

  // The actual creation logic (validation, moderation, category/status
  // resolution, the DB write, audit log, admin alerts) is shared with
  // app/api/embed/posts, the bearer-authenticated equivalent of this
  // action for the embed widget — see lib/posts/submit-feedback.ts.
  const result = await submitFeedback(actor, input);
  if (!result.ok) {
    return {
      success: false,
      error: result.error,
      field: result.field,
      code: result.code,
    };
  }

  // Keep the admin feedback list (and the public board, for a live post) in
  // sync so a freshly created draft/post shows up without a manual reload.
  // Server-Action/RSC-cache-specific — the Route Handler equivalent has no
  // counterpart and relies on the client updating its own local state.
  if (result.data.workspaceSlug) {
    revalidatePath(`/${result.data.workspaceSlug}/feedback`);
    if (!result.data.isDraft && !result.data.isPending) {
      revalidatePath(
        `/${result.data.workspaceSlug}/b/${result.data.boardSlug}`
      );
    }
  }

  return {
    success: true,
    data: {
      postId: result.data.postId,
      postSlug: result.data.postSlug,
      isPending: result.data.isPending,
      isDraft: result.data.isDraft,
    },
  };
}

// ─── Upload Post Image ────────────────────────────────────────────────────────

export async function uploadPostImageAction(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  // See createPostAction above — a resolved actor, not requireSession, so a
  // stale/missing identity surfaces as a normal error instead of a redirect
  // that would navigate the embed widget's iframe away. Guests may attach an
  // image to the feedback they are about to submit.
  const actor = await getPortalActor();
  if (!actor) {
    return {
      success: false,
      error: "Verify your email to attach an image.",
      code: "UNAUTHENTICATED",
    };
  }

  const file = formData.get("image");
  const result = await uploadPostImage(
    actor.id ?? guestUploadKey(actor.email),
    file instanceof File ? file : null
  );
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data };
}

// ─── Update Post Status ───────────────────────────────────────────────────────

const updateStatusSchema = z.object({
  postId: z.string().min(1),
  workspaceId: z.string().min(1),
  status: z.string().min(1),
  notify: z.boolean().optional(),
});

export async function updatePostStatusAction(input: {
  postId: string;
  workspaceId: string;
  status: string;
  // Whether this change should notify voters (each voter's own
  // emailStatusChange/inAppStatusChange preference still applies on top of
  // this — see enqueueStatusChangeEmails). Defaults to false: this is an
  // explicit admin opt-in per change, not sent unconditionally.
  notify?: boolean;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  // Triage (changing status) is available to any workspace member — Brand Admin
  // and Team Member alike (PLATFORM.md §4).
  const actorMember = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return {
      success: false,
      error: "Only workspace members can update post status.",
    };
  }

  const post = await getPost(parsed.data.postId);
  if (!post || post.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Post not found." };
  }
  if (post.status === parsed.data.status) {
    return { success: true, data: undefined };
  }

  // A post's status must be one of the workspace's defined statuses.
  const targetStatus = await getWorkspaceStatusBySlug(
    parsed.data.workspaceId,
    parsed.data.status
  );
  if (!targetStatus) {
    return { success: false, error: "That status does not exist." };
  }

  await updatePostStatus(parsed.data.postId, parsed.data.status);

  // Append to the post's status history (who changed it, from → to).
  recordStatusChange({
    postId: parsed.data.postId,
    fromStatus: post.status,
    toStatus: parsed.data.status,
    changedBy: session.user.id,
    changedByName: session.user.name ?? session.user.email,
  }).catch((err) =>
    console.error("[posts] failed to record status change", err)
  );

  audit({
    action: "post.status_changed",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: parsed.data.postId,
    description: `Status changed: ${post.status} → ${parsed.data.status}`,
    metadata: {
      workspaceId: parsed.data.workspaceId,
      fromStatus: post.status,
      toStatus: parsed.data.status,
    },
  });

  // A draft isn't public yet, so a status change on it must not notify voters
  // — that only runs once it's published. Beyond that, notifying is now an
  // explicit per-change admin choice (the "Notify all voters" checkbox in
  // StatusSelect), not automatic.
  if (!post.isDraft && parsed.data.notify) {
    // Notify voters (fire-and-forget)
    enqueueStatusChangeEmails({
      postId: parsed.data.postId,
      postTitle: post.title,
      postSlug: post.slug,
      boardId: post.boardId,
      workspaceId: parsed.data.workspaceId,
      fromStatus: post.status,
      toStatus: parsed.data.status,
      changedById: session.user.id,
    }).catch((err) =>
      console.error("[posts] failed to enqueue status-change emails", err)
    );
  }

  return { success: true, data: undefined };
}

// ─── Pin / Unpin Post ─────────────────────────────────────────────────────────

export async function pinPostAction(input: {
  postId: string;
  workspaceId: string;
  pin: boolean;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  // Pinning is a triage action available to any workspace member (PLATFORM.md §4).
  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return {
      success: false,
      error: "Only workspace members can pin posts.",
    };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }
  if (post.isPinned === input.pin) {
    return { success: true, data: undefined };
  }

  await setPinned(input.postId, input.pin);

  audit({
    action: input.pin ? "post.pinned" : "post.unpinned",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: input.postId,
    description: `Post ${input.pin ? "pinned" : "unpinned"}: ${post.title}`,
    metadata: { workspaceId: input.workspaceId },
  });

  return { success: true, data: undefined };
}

// ─── Delete Post ──────────────────────────────────────────────────────────────

export async function deletePostAction(input: {
  postId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  const isAuthor = post.authorId === session.user.id;

  // Any workspace member may remove feedback as clean-up (PLATFORM.md §4);
  // authors may remove their own feedback.
  if (!isAuthor && !actorMember) {
    return {
      success: false,
      error: "You don't have permission to delete this post.",
    };
  }

  await deletePost(input.postId);

  audit({
    action: "post.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: input.postId,
    description: `Deleted post: ${post.title}`,
    metadata: {
      workspaceId: input.workspaceId,
      title: post.title,
      wasAuthor: isAuthor,
    },
  });

  return { success: true, data: undefined };
}

// ─── Duplicate Post ──────────────────────────────────────────────────────────

export async function duplicatePostAction(input: {
  postId: string;
  workspaceId: string;
}): Promise<ActionResult<{ postId: string }>> {
  const session = await requireSession();

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  // Duplicating is a team triage action (mirrors pin/merge; PLATFORM.md §4).
  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return {
      success: false,
      error: "You don't have permission to duplicate this post.",
    };
  }

  const title = `${post.title} (copy)`;
  const slug = await generatePostSlug(post.boardId, title);

  const created = await createPost({
    boardId: post.boardId,
    workspaceId: input.workspaceId,
    slug,
    title,
    body: post.body,
    categoryId: post.categoryId,
    authorId: session.user.id,
    authorName: session.user.name ?? null,
    authorEmail: session.user.email,
    imageUrl: post.imageUrl,
    status: post.status,
    isApproved: true,
    // A copy inherits the source's draft state — duplicating a draft must not
    // silently publish it.
    isDraft: post.isDraft,
  });

  audit({
    workspaceId: input.workspaceId,
    action: "post.created",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "post",
    entityId: created.id,
    description: `Duplicated post: ${post.title}`,
    metadata: {
      workspaceId: input.workspaceId,
      sourcePostId: post.id,
      title,
      slug,
    },
  });

  return { success: true, data: { postId: created.id } };
}

// ─── Update Post (edit title / body) ─────────────────────────────────────────

const updatePostSchema = z.object({
  postId: z.string().min(1),
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
  // Omit to leave the image untouched, null to remove it, a URL to replace it.
  imageUrl: z.url().nullish(),
});

export async function updatePostAction(input: {
  postId: string;
  workspaceId: string;
  title: string;
  body?: string;
  imageUrl?: string | null;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = updatePostSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string | undefined,
    };
  }

  const actorMember = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return { success: false, error: "You are not a member of this workspace." };
  }

  const post = await getPost(parsed.data.postId);
  if (!post || post.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  // The author can edit their own post; admins and owners can edit any post.
  const isAuthor = post.authorId === session.user.id;
  const isAdminOrOwner = actorMember.role !== WORKSPACE_MEMBER;
  if (!isAuthor && !isAdminOrOwner) {
    return {
      success: false,
      error: "You don't have permission to edit this post.",
    };
  }

  await updatePost(parsed.data.postId, {
    title: parsed.data.title,
    body: parsed.data.body?.trim() ? parsed.data.body : null,
    imageUrl: parsed.data.imageUrl,
  });

  audit({
    action: "post.updated",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: parsed.data.postId,
    description: `Edited post: ${parsed.data.title}`,
    metadata: { workspaceId: parsed.data.workspaceId, wasAuthor: isAuthor },
  });

  return { success: true, data: undefined };
}

// ─── Assign Post ──────────────────────────────────────────────────────────────

export async function assignPostAction(input: {
  postId: string;
  workspaceId: string;
  assigneeId: string | null;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  // Assigning feedback to a Team Member is Brand-Admin-only (PLATFORM.md §4) —
  // unlike category/status triage, this isn't opened up to every member.
  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember || actorMember.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only Brand Admins can assign feedback.",
    };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  if (input.assigneeId) {
    const assigneeMember = await getWorkspaceMember(
      input.workspaceId,
      input.assigneeId
    );
    if (!assigneeMember) {
      return {
        success: false,
        error: "The assignee must be a member of this workspace.",
      };
    }
  }

  await assignPost(input.postId, input.assigneeId);

  audit({
    action: input.assigneeId ? "post.assigned" : "post.unassigned",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: input.postId,
    description: input.assigneeId
      ? `Assigned post: ${post.title}`
      : `Unassigned post: ${post.title}`,
    metadata: { workspaceId: input.workspaceId, assigneeId: input.assigneeId },
  });

  if (input.assigneeId && input.assigneeId !== session.user.id) {
    const [workspaceRow] = await db
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, input.workspaceId))
      .limit(1);

    if (workspaceRow) {
      createNotification({
        userId: input.assigneeId,
        workspaceId: input.workspaceId,
        type: "assignment",
        title: `You were assigned: ${post.title}`,
        link: `/${workspaceRow.slug}/feedback/${post.id}`,
      }).catch((err) =>
        console.error("[posts] failed to create assignment notification", err)
      );
    }
  }

  return { success: true, data: undefined };
}

// ─── Approve Post (moderation queue) ─────────────────────────────────────────

export async function approvePostAction(input: {
  postId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember || actorMember.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can approve posts.",
    };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  if (post.isApproved) {
    return { success: true, data: undefined };
  }

  await approvePost(input.postId);

  audit({
    workspaceId: input.workspaceId,
    action: "post.approved",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "post",
    entityId: input.postId,
    entityName: post.title,
    description: `Approved post: ${post.title}`,
    metadata: { workspaceId: input.workspaceId },
  });

  // Now that it's visible, notify admins
  enqueueNewPostAlerts({
    postId: post.id,
    postTitle: post.title,
    postBody: post.body ?? null,
    postSlug: post.slug,
    boardId: post.boardId,
    workspaceId: input.workspaceId,
    authorId: post.authorId ?? "",
    authorName: post.authorName ?? post.authorEmail ?? "Someone",
  }).catch((err) =>
    console.error(
      "[posts] failed to enqueue new-post alerts after approval",
      err
    )
  );

  return { success: true, data: undefined };
}

// ─── Publish Draft ───────────────────────────────────────────────────────────

export async function publishPostAction(input: {
  postId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  // Publishing feedback is a workspace-member (triage) capability, same as
  // creating/managing it (PLATFORM.md §4).
  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return {
      success: false,
      error: "You don't have permission to publish this feedback.",
    };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  if (!post.isDraft) {
    // Already published — treat as a no-op so double-clicks are harmless.
    return { success: true, data: undefined };
  }

  await publishPost(input.postId);

  audit({
    workspaceId: input.workspaceId,
    action: "post.published",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "post",
    entityId: post.id,
    entityName: post.title,
    description: `Published draft: ${post.title}`,
    metadata: { workspaceId: input.workspaceId, boardId: post.boardId },
  });

  // Fire the same side-effects a normal published post triggers at creation —
  // but only now, at publish time. A draft that was auto-approved becomes
  // publicly visible; a moderation-held draft still waits for approval.
  if (post.isApproved) {
    enqueueNewPostAlerts({
      postId: post.id,
      postTitle: post.title,
      postBody: post.body ?? null,
      postSlug: post.slug,
      boardId: post.boardId,
      workspaceId: input.workspaceId,
      authorId: post.authorId ?? "",
      authorName: post.authorName ?? post.authorEmail ?? "Someone",
    }).catch((err) =>
      console.error(
        "[posts] failed to enqueue new-post alerts after publish",
        err
      )
    );
  }

  // Now that it's live, refresh the admin views and every public surface it can
  // appear on so it shows up without waiting for a cache to expire.
  const [wsRow] = await db
    .select({ slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .limit(1);
  const [boardRow] = await db
    .select({ slug: boards.slug })
    .from(boards)
    .where(eq(boards.id, post.boardId))
    .limit(1);
  if (wsRow?.slug) {
    revalidatePath(`/${wsRow.slug}/feedback`);
    revalidatePath(`/${wsRow.slug}/feedback/${post.id}`);
    revalidatePath(`/${wsRow.slug}/roadmap`);
    if (boardRow?.slug) {
      revalidatePath(`/${wsRow.slug}/b/${boardRow.slug}`);
    }
  }

  return { success: true, data: undefined };
}

// ─── Unpublish Post (revert to draft) ────────────────────────────────────────

export async function unpublishPostAction(input: {
  postId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  // Reverting to draft is the inverse of publishing — same workspace-member
  // (triage) capability, same permission gate as publishPostAction.
  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return {
      success: false,
      error: "You don't have permission to move this feedback to draft.",
    };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  if (post.isDraft) {
    // Already a draft — no-op so re-selecting "Draft" doesn't write or notify.
    return { success: true, data: undefined };
  }

  await unpublishPost(input.postId);

  audit({
    workspaceId: input.workspaceId,
    action: "post.unpublished",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "post",
    entityId: post.id,
    entityName: post.title,
    description: `Reverted to draft: ${post.title}`,
    metadata: { workspaceId: input.workspaceId, boardId: post.boardId },
  });

  // Refresh the admin views and every public surface it could appear on so it
  // drops from public immediately (the inverse of the publish revalidation).
  const [wsRow] = await db
    .select({ slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .limit(1);
  const [boardRow] = await db
    .select({ slug: boards.slug })
    .from(boards)
    .where(eq(boards.id, post.boardId))
    .limit(1);
  if (wsRow?.slug) {
    revalidatePath(`/${wsRow.slug}/feedback`);
    revalidatePath(`/${wsRow.slug}/feedback/${post.id}`);
    revalidatePath(`/${wsRow.slug}/roadmap`);
    if (boardRow?.slug) {
      revalidatePath(`/${wsRow.slug}/b/${boardRow.slug}`);
    }
  }

  return { success: true, data: undefined };
}

// ─── Unapprove Post (hide from public view) ──────────────────────────────────

export async function unapprovePostAction(input: {
  postId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember || actorMember.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can change a post's visibility.",
    };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  if (!post.isApproved) {
    return { success: true, data: undefined };
  }

  await unapprovePost(input.postId);

  audit({
    workspaceId: input.workspaceId,
    action: "post.unapproved",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "post",
    entityId: input.postId,
    entityName: post.title,
    description: `Hid post from public view: ${post.title}`,
    metadata: { workspaceId: input.workspaceId },
  });

  return { success: true, data: undefined };
}

// ─── Merge Post ───────────────────────────────────────────────────────────────

export async function mergePostAction(input: {
  sourceId: string;
  targetId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  // Merging is a triage action available to any workspace member (PLATFORM.md §4).
  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return {
      success: false,
      error: "Only workspace members can merge feedback.",
    };
  }

  if (input.sourceId === input.targetId) {
    return { success: false, error: "A post can't be merged into itself." };
  }

  const source = await getPost(input.sourceId);
  if (!source || source.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }
  if (source.mergedIntoId) {
    return { success: false, error: "This post is already merged." };
  }

  const target = await getPost(input.targetId);
  if (!target || target.workspaceId !== input.workspaceId) {
    return { success: false, error: "The post to merge into was not found." };
  }
  if (target.mergedIntoId) {
    return {
      success: false,
      error: "The post you're merging into is itself merged.",
    };
  }

  const voteSnapshot = await mergePost(input.sourceId, input.targetId);

  audit({
    action: "post.merged",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name,
    entityType: "post",
    entityId: input.sourceId,
    description: `Merged "${source.title}" into "${target.title}"`,
    // voteSnapshot rides along here rather than in a dedicated table — it's
    // read back by unmergePostAction (via unmergePost) to restore the
    // source's pre-merge votes if this merge is later undone.
    metadata: {
      workspaceId: input.workspaceId,
      targetId: input.targetId,
      voteSnapshot,
    },
  });

  return { success: true, data: undefined };
}

export async function unmergePostAction(input: {
  postId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  // Same triage-level permission as merging itself.
  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return {
      success: false,
      error: "Only workspace members can unmerge feedback.",
    };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }
  if (!post.mergedIntoId) {
    return { success: false, error: "This post is not merged." };
  }

  const target = await getPost(post.mergedIntoId);

  try {
    await unmergePost(input.postId);
  } catch (err) {
    if (err instanceof UnmergeError) {
      return { success: false, error: err.message };
    }
    throw err;
  }

  audit({
    action: "post.unmerged",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name,
    entityType: "post",
    entityId: input.postId,
    description: target
      ? `Unmerged "${post.title}" from "${target.title}"`
      : `Unmerged "${post.title}"`,
    metadata: {
      workspaceId: input.workspaceId,
      previousTargetId: post.mergedIntoId,
    },
  });

  return { success: true, data: undefined };
}

// ─── Merge Target Search ────────────────────────────────────────────────────

export async function searchMergeTargetsAction(input: {
  workspaceId: string;
  query: string;
  excludePostId: string;
}): Promise<
  ActionResult<{
    posts: {
      commentCount: number;
      id: string;
      title: string;
      upvotes: number;
    }[];
  }>
> {
  const session = await requireSession();

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return { success: false, error: "Forbidden." };
  }

  const results = await searchPostsForMerge(
    input.workspaceId,
    input.query,
    input.excludePostId
  );
  return { success: true, data: { posts: results } };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function enqueueStatusChangeEmails(input: {
  postId: string;
  postTitle: string;
  postSlug: string;
  boardId: string;
  workspaceId: string;
  fromStatus: string;
  toStatus: string;
  changedById: string;
}) {
  const [boardRow] = await db
    .select({ slug: boards.slug })
    .from(boards)
    .where(eq(boards.id, input.boardId))
    .limit(1);

  const [workspaceRow] = await db
    .select({ slug: workspaces.slug, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .limit(1);

  if (!boardRow || !workspaceRow) {
    return;
  }

  // Signed-in voters don't store a denormalised email/name on their vote (see
  // castVote) — resolve it from their account so they still get notified.
  const voters = await db
    .select({
      userId: votes.userId,
      userEmail: votes.userEmail,
      userName: votes.userName,
      accountEmail: user.email,
      accountName: user.name,
    })
    .from(votes)
    .leftJoin(user, eq(votes.userId, user.id))
    .where(eq(votes.postId, input.postId));

  for (const voter of voters) {
    const email = voter.userEmail ?? voter.accountEmail;
    if (!email) {
      continue;
    }

    await enqueueJob(JOB_NAMES.SEND_STATUS_CHANGE_EMAIL, {
      postId: input.postId,
      postTitle: input.postTitle,
      postSlug: input.postSlug,
      workspaceId: input.workspaceId,
      workspaceSlug: workspaceRow.slug,
      workspaceName: workspaceRow.name,
      boardSlug: boardRow.slug,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      voterEmail: email,
      voterName: voter.userName ?? voter.accountName ?? email.split("@")[0],
      voterUserId: voter.userId ?? null,
      changedById: input.changedById,
    });
  }
}
