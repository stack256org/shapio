import type { Job } from "pg-boss";
import { enqueueEmail } from "@/lib/email/index";
import { pendingCommentAlertEmailTemplate } from "@/lib/email/templates/pending-comment-alert";
import { createNotification } from "@/lib/notifications/create";
import { adminBaseUrl } from "@/lib/urls";
import type { SendPendingCommentAlertPayload } from "@/lib/worker/job-types";

export async function handleSendPendingCommentAlert(
  jobs: Job<SendPendingCommentAlertPayload>[]
) {
  for (const job of jobs) {
    await processSendPendingCommentAlert(job);
  }
}

async function processSendPendingCommentAlert(
  job: Job<SendPendingCommentAlertPayload>
) {
  const {
    commentBody,
    commenterId,
    commenterName,
    postId,
    postTitle,
    boardName,
    workspaceId,
    workspaceSlug,
    workspaceName,
    moderatorEmail,
    moderatorUserId,
  } = job.data;

  // Self-notification suppression: don't alert the moderator who authored
  // the comment (a signed-in admin/owner can comment on their own workspace).
  if (commenterId === moderatorUserId) {
    return;
  }

  // Review link goes to the admin dashboard's feedback detail page, where
  // the comment moderation queue (approve/delete) already lives — not the
  // public portal, since the recipient is always a team member triaging.
  const reviewUrl = `${adminBaseUrl()}/${workspaceSlug}/feedback/${postId}`;

  const { subject, html, text } = pendingCommentAlertEmailTemplate({
    commenterName: commenterName || "Someone",
    commentBody,
    postTitle,
    reviewUrl,
    boardName,
    workspaceName,
  });

  await enqueueEmail({ to: moderatorEmail, subject, html, text });

  await createNotification({
    userId: moderatorUserId,
    workspaceId,
    type: "pending_comment",
    title: `Comment awaiting approval on "${postTitle}"`,
    body: `From ${commenterName || "a user"}`,
    link: `/${workspaceSlug}/feedback/${postId}`,
  });
}
