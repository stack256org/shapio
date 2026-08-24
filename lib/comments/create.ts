import { createId } from "@paralleldrive/cuid2";
import { eq, sql } from "drizzle-orm";
import { boards, comments, posts, user, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email";
import { CommentReplyEmail } from "@/lib/email/components/comment-reply";
import { NewCommentEmail } from "@/lib/email/components/new-comment";
import { renderEmailTemplate } from "@/lib/email/renderer";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe";
import { isBlocked } from "@/lib/moderation/queries";
import { createNotification } from "@/lib/notifications/create";
import { isEmailNotificationEnabled } from "@/lib/notifications/queries";
import { portalBaseUrl } from "@/lib/urls";
import { enqueuePendingCommentAlerts } from "./notify";
import { commentPreviewText } from "./preview";

export class CommentBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentBlockedError";
  }
}

export class CommentNotFoundError extends Error {
  constructor(message = "Post not found.") {
    super(message);
    this.name = "CommentNotFoundError";
  }
}

export async function createComment(
  postId: string,
  input: {
    body: string;
    parentId?: string | null;
    authorId?: string | null;
    authorEmail?: string | null;
    authorName?: string | null;
    authorAvatar?: string | null;
  },
  workspaceId: string
) {
  const { body, parentId, authorId, authorEmail, authorName, authorAvatar } =
    input;

  // Commenting requires either a signed-in account OR an accountless Public
  // Portal visitor who has verified their email (lib/portal/guest-identity.ts).
  // An unidentified caller is still refused — comments.authorId is nullable,
  // but authorEmail is what attributes and moderates a guest comment, so
  // neither may be missing.
  if (!(authorId || authorEmail)) {
    throw new CommentBlockedError("You must be signed in to comment.");
  }

  // Pre-flight: fetch post
  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!post) {
    throw new CommentNotFoundError();
  }
  if (post.isLocked) {
    throw new CommentBlockedError("Comments are closed on this post.");
  }

  // Block check
  if (authorId || input.authorEmail) {
    const blocked = await isBlocked(workspaceId, {
      userId: authorId ?? undefined,
      userEmail: input.authorEmail ?? undefined,
    });
    if (blocked) {
      throw new CommentBlockedError(
        "You are not allowed to comment in this workspace."
      );
    }
  }

  // Validate parent if provided
  if (parentId) {
    const parent = await db
      .select()
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!parent) {
      throw new CommentBlockedError("Parent comment not found.");
    }
    if (parent.parentId !== null) {
      throw new CommentBlockedError("Replies to replies are not allowed.");
    }
    if (parent.postId !== postId) {
      throw new CommentBlockedError(
        "Parent comment does not belong to this post."
      );
    }
  }

  // Determine approval based on workspace comment moderation
  const workspace = await db
    .select({ commentModeration: workspaces.commentModeration })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1)
    .then((r) => r[0] ?? null);

  const isApproved = !workspace?.commentModeration;

  // Snapshot author info from user if signed in
  let resolvedAuthorName = authorName ?? null;
  let resolvedAuthorAvatar = authorAvatar ?? null;

  if (authorId) {
    const userRow = await db
      .select({ name: user.name, image: user.image })
      .from(user)
      .where(eq(user.id, authorId))
      .limit(1)
      .then((r) => r[0] ?? null);

    resolvedAuthorName = userRow?.name ?? authorName ?? null;
    resolvedAuthorAvatar = userRow?.image ?? null;
  }

  const commentId = createId();

  await db.transaction(async (tx) => {
    await tx.insert(comments).values({
      id: commentId,
      postId,
      parentId: parentId ?? null,
      body: body.trim(),
      isApproved,
      isDeleted: false,
      authorId: authorId ?? null,
      authorEmail: authorEmail ?? null,
      authorName: resolvedAuthorName,
      authorAvatar: resolvedAuthorAvatar,
    });

    if (isApproved) {
      await tx
        .update(posts)
        .set({ commentCount: sql`${posts.commentCount} + 1` })
        .where(eq(posts.id, postId));
    }
  });

  // Fetch the created comment
  const comment = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)
    .then((r) => r[0]!);

  // Send notifications (only for approved comments)
  if (isApproved) {
    sendCommentNotifications(
      comment,
      post,
      workspace?.commentModeration ?? false
    ).catch((err) => console.error("[comments] notification error", err));
  } else {
    // Comment is pending moderation — alert admins/owners so approval
    // doesn't rely on someone happening to reopen this exact post.
    enqueuePendingCommentAlerts({
      commentId: comment.id,
      commentBody: comment.body,
      commenterId: authorId ?? null,
      commenterName: resolvedAuthorName ?? authorEmail ?? "Someone",
      postId: post.id,
      postTitle: post.title,
      postSlug: post.slug,
      boardId: post.boardId,
      workspaceId,
    }).catch((err) =>
      console.error("[comments] pending-comment alert error", err)
    );
  }

  return comment;
}

export async function sendCommentNotifications(
  comment: {
    id: string;
    postId: string;
    parentId: string | null;
    authorId: string | null;
    authorEmail: string | null;
    authorName: string | null;
    body: string;
  },
  post: {
    id: string;
    title: string;
    slug: string | null;
    authorId: string | null;
    authorEmail: string;
    authorName: string | null;
    workspaceId: string;
    boardId: string;
  },
  _moderationEnabled: boolean
) {
  // Public post links in comment/reply emails point at the Public Portal host.
  const appUrl = portalBaseUrl();

  // Get workspace + board info for URLs
  const workspace = await db
    .select({ name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, post.workspaceId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!workspace) {
    return;
  }

  const board = await db
    .select({ slug: boards.slug })
    .from(boards)
    .where(eq(boards.id, post.boardId))
    .limit(1)
    .then((r) => r[0] ?? null);

  const commenterName = comment.authorName ?? comment.authorEmail ?? "Someone";
  const bodyPreview = commentPreviewText(comment.body, 300);
  const postUrl = board
    ? `${appUrl}/${workspace.slug}/b/${board.slug}/p/${post.slug ?? post.id}`
    : `${appUrl}/${workspace.slug}`;
  // In-app notifications are only ever viewed from the workspace admin
  // sidebar (there's no customer-facing notification list), so this link
  // goes to the admin feedback detail page, not the public portal.
  const postLink = `/${workspace.slug}/feedback/${post.id}`;

  if (comment.parentId) {
    // Reply: notify parent comment author
    const parent = await db
      .select({
        authorId: comments.authorId,
        authorEmail: comments.authorEmail,
        authorName: comments.authorName,
      })
      .from(comments)
      .where(eq(comments.id, comment.parentId))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!parent?.authorEmail && !parent?.authorId) {
      return;
    }
    if (parent.authorId && parent.authorId === comment.authorId) {
      return;
    }

    let recipientEmail: string | null = parent.authorEmail;
    let recipientName = parent.authorName ?? "there";
    let recipientUserId: string | null = parent.authorId ?? null;

    if (parent.authorId) {
      const parentUserRow = await db
        .select({ email: user.email, name: user.name })
        .from(user)
        .where(eq(user.id, parent.authorId))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (parentUserRow) {
        recipientEmail = parentUserRow.email;
        recipientName = parentUserRow.name ?? recipientName;
        recipientUserId = parent.authorId;
      }
    }

    if (!recipientEmail) {
      return;
    }

    // Honour the recipient's email-notification preference / unsubscribe choice.
    const emailEnabled = recipientUserId
      ? await isEmailNotificationEnabled(recipientUserId, "emailNewComment")
      : true;

    if (emailEnabled) {
      try {
        const html = await renderEmailTemplate(
          CommentReplyEmail({
            parentAuthorName: recipientName,
            postTitle: post.title,
            postUrl,
            replierName: commenterName,
            replyBody: bodyPreview,
            workspaceName: workspace.name,
            unsubscribeUrl: recipientUserId
              ? buildUnsubscribeUrl(recipientUserId)
              : null,
          })
        );

        await enqueueEmail({
          to: recipientEmail,
          subject: `${commenterName} replied to your comment on ${post.title}`,
          html,
        });
      } catch (err) {
        console.error("[comments] failed to enqueue comment-reply email", err);
      }
    }

    // In-app notification for parent comment author
    if (recipientUserId) {
      createNotification({
        userId: recipientUserId,
        workspaceId: post.workspaceId,
        type: "reply",
        title: `${commenterName} replied to your comment`,
        body: bodyPreview.slice(0, 120),
        link: postLink,
      }).catch(() => {});
    }
  } else {
    // Top-level comment: notify post author. An accountless author has no
    // authorId but always has an authorEmail (the column is NOT NULL), so they
    // are still reachable by email — mirroring the reply branch above, which
    // has always handled guests. Don't self-notify: matched by id for an
    // account, by email for a guest.
    const isSelfComment = post.authorId
      ? post.authorId === comment.authorId
      : !!post.authorEmail && post.authorEmail === comment.authorEmail;
    if (isSelfComment || !post.authorEmail) {
      return;
    }

    const postAuthorUser = post.authorId
      ? await db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, post.authorId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : null;

    // Honour the post author's email-notification preference / unsubscribe
    // choice. A guest can hold no preference row (its PK is a FK to `user`),
    // so they default to enabled — same as the reply branch.
    const emailEnabled = post.authorId
      ? await isEmailNotificationEnabled(post.authorId, "emailNewComment")
      : true;

    if (emailEnabled) {
      try {
        const html = await renderEmailTemplate(
          NewCommentEmail({
            postAuthorName: postAuthorUser?.name ?? post.authorName ?? "there",
            postTitle: post.title,
            postUrl,
            commenterName,
            commentBody: bodyPreview,
            workspaceName: workspace.name,
            // Unsubscribe tokens are HMACs over a user id, so a guest gets
            // none — their only "unsubscribe" is not posting again.
            unsubscribeUrl: post.authorId
              ? buildUnsubscribeUrl(post.authorId)
              : null,
          })
        );

        await enqueueEmail({
          to: post.authorEmail,
          subject: `${commenterName} commented on your post — ${post.title}`,
          html,
        });
      } catch (err) {
        console.error("[comments] failed to enqueue new-comment email", err);
      }
    }

    // In-app notification for post author
    if (post.authorId) {
      createNotification({
        userId: post.authorId,
        workspaceId: post.workspaceId,
        type: "new_comment",
        title: `New comment on "${post.title}"`,
        body: bodyPreview.slice(0, 120),
        link: postLink,
      }).catch(() => {});
    }
  }
}
