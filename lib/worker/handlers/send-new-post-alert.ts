import type { Job } from "pg-boss";
import { enqueueEmail } from "@/lib/email/index";
import { newPostAlertEmailTemplate } from "@/lib/email/templates/new-post-alert";
import { createNotification } from "@/lib/notifications/create";
import { portalBaseUrl } from "@/lib/urls";
import type { SendNewPostAlertPayload } from "@/lib/worker/job-types";

export async function handleSendNewPostAlert(
  jobs: Job<SendNewPostAlertPayload>[]
) {
  for (const job of jobs) {
    await processSendNewPostAlert(job);
  }
}

async function processSendNewPostAlert(job: Job<SendNewPostAlertPayload>) {
  const {
    postId,
    postTitle,
    postBody,
    postSlug,
    workspaceId,
    workspaceSlug,
    workspaceName,
    boardName,
    boardSlug,
    authorName,
    authorId,
    adminEmail,
    adminUserId,
  } = job.data;

  // Self-notification suppression: don't alert the admin who authored the post
  if (authorId === adminUserId) {
    return;
  }

  const postUrl = `${portalBaseUrl()}/${workspaceSlug}/b/${boardSlug}/p/${postSlug}`;

  const { subject, html, text } = newPostAlertEmailTemplate({
    adminName: "there",
    authorName: authorName || "Someone",
    postTitle,
    postBody,
    postUrl,
    boardName,
    workspaceName,
  });

  await enqueueEmail({ to: adminEmail, subject, html, text });

  // In-app notification for admin — links into the workspace admin's own
  // feedback detail page, not the public portal (the recipient here is
  // always a team member triaging the post, never a portal visitor).
  await createNotification({
    userId: adminUserId,
    workspaceId,
    type: "new_post",
    title: `New post: "${postTitle}"`,
    body: `Submitted by ${authorName || "a user"} on ${boardName}`,
    link: `/${workspaceSlug}/feedback/${postId}`,
  });
}
