import { randomBytes, randomUUID } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { INVITE_EXPIRY_DAYS } from "@/config/platform";
import {
  emailOutbox,
  workspaceInvites,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { user } from "@/db/schema/auth";
import { db } from "@/lib/db";
import { inviteTemplate } from "@/lib/email/templates/invite";
import { env } from "@/lib/env";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

export interface CreateInviteInput {
  appUrl: string;
  email: string;
  invitedById: string;
  inviterEmail: string;
  inviterName: string;
  role: "member" | "admin";
  workspaceId: string;
  workspaceName: string;
}

export async function createInvite(
  input: CreateInviteInput
): Promise<{ inviteId: string }> {
  const token = randomBytes(32).toString("base64url");
  const inviteId = createId();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 864e5);
  const inviteUrl = `${input.appUrl}/invite/${token}`;

  // Never log the recipient or the invite URL in production — the URL is a live
  // credential (anyone holding it can join the workspace) and the address is
  // PII. The dev log lets you accept an invite locally without SMTP
  // configured, mirroring [magic-link] in lib/auth.ts and [portal-otp] in
  // lib/portal/verification.ts.
  if (env.NODE_ENV !== "production") {
    console.log(`[invite] recipient=${input.email} url=${inviteUrl}`);
  }

  const { html, text } = await inviteTemplate({
    inviterName: input.inviterName,
    workspaceName: input.workspaceName,
    role: input.role,
    inviteUrl,
  });

  const subject = `${input.inviterName} invited you to join ${input.workspaceName}`;

  let outboxId!: string;

  await db.transaction(async (tx) => {
    await tx.insert(workspaceInvites).values({
      id: inviteId,
      workspaceId: input.workspaceId,
      invitedById: input.invitedById,
      email: input.email,
      role: input.role,
      token,
      expiresAt,
    });

    const [outboxRow] = await tx
      .insert(emailOutbox)
      .values({
        idempotencyKey: randomUUID(),
        payload: { to: input.email, subject, html, text },
        status: "queued",
      })
      .returning({ id: emailOutbox.id });

    outboxId = outboxRow.id;
  });

  await enqueueJob(JOB_NAMES.EMAIL_SEND, { outboxId });

  return { inviteId };
}

/**
 * Token of the oldest live invite addressed to this email, if any.
 *
 * Used to route a just-authenticated user who has no workspace yet back to
 * `/invite/[token]` to finish accepting, instead of into the "create your
 * own workspace" onboarding wizard — covers anyone who signed in without
 * landing back on the invite page first (e.g. a bookmarked /signin link).
 */
export async function getPendingInviteTokenForEmail(
  email: string
): Promise<string | null> {
  const [row] = await db
    .select({ token: workspaceInvites.token })
    .from(workspaceInvites)
    .where(
      and(
        eq(sql`lower(${workspaceInvites.email})`, email.trim().toLowerCase()),
        isNull(workspaceInvites.acceptedAt),
        isNull(workspaceInvites.revokedAt),
        gt(workspaceInvites.expiresAt, new Date())
      )
    )
    .orderBy(workspaceInvites.createdAt)
    .limit(1);
  return row?.token ?? null;
}

export async function checkDuplicateInvite(
  workspaceId: string,
  email: string
): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .select({ id: workspaceInvites.id })
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.workspaceId, workspaceId),
        eq(sql`lower(${workspaceInvites.email})`, email.toLowerCase()),
        isNull(workspaceInvites.acceptedAt),
        isNull(workspaceInvites.revokedAt),
        gt(workspaceInvites.expiresAt, now)
      )
    )
    .limit(1);
  return !!row;
}

export async function getInviteByToken(token: string) {
  const [row] = await db
    .select({
      id: workspaceInvites.id,
      workspaceId: workspaceInvites.workspaceId,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      expiresAt: workspaceInvites.expiresAt,
      acceptedAt: workspaceInvites.acceptedAt,
      revokedAt: workspaceInvites.revokedAt,
      workspace: {
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        isSuspended: workspaces.isSuspended,
      },
      inviter: {
        name: user.name,
        email: user.email,
      },
    })
    .from(workspaceInvites)
    .innerJoin(workspaces, eq(workspaceInvites.workspaceId, workspaces.id))
    .leftJoin(user, eq(workspaceInvites.invitedById, user.id))
    .where(eq(workspaceInvites.token, token))
    .limit(1);
  return row ?? null;
}

export async function getInviteById(inviteId: string, workspaceId: string) {
  const [row] = await db
    .select()
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.id, inviteId),
        eq(workspaceInvites.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export type AcceptInviteResult =
  | { ok: true; workspaceId: string; workspaceSlug: string }
  | {
      ok: false;
      code:
        | "not_found"
        | "expired"
        | "revoked"
        | "already_accepted"
        | "mismatch"
        | "already_member"
        | "workspace_suspended";
    };

export async function acceptInvite(input: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<AcceptInviteResult> {
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(workspaceInvites)
      .where(eq(workspaceInvites.token, input.token))
      .for("update")
      .limit(1);

    if (!invite) {
      return { ok: false, code: "not_found" };
    }
    if (invite.acceptedAt) {
      return { ok: false, code: "already_accepted" };
    }
    if (invite.revokedAt) {
      return { ok: false, code: "revoked" };
    }
    if (invite.expiresAt <= new Date()) {
      return { ok: false, code: "expired" };
    }

    const [workspace] = await tx
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        isSuspended: workspaces.isSuspended,
      })
      .from(workspaces)
      .where(eq(workspaces.id, invite.workspaceId))
      .limit(1);

    if (!workspace || workspace.isSuspended) {
      return { ok: false, code: "workspace_suspended" };
    }

    if (invite.email.toLowerCase() !== input.userEmail.toLowerCase()) {
      return { ok: false, code: "mismatch" };
    }

    const [existingMember] = await tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, invite.workspaceId),
          eq(workspaceMembers.userId, input.userId)
        )
      )
      .limit(1);

    if (existingMember) {
      return { ok: false, code: "already_member" };
    }

    await tx.insert(workspaceMembers).values({
      workspaceId: invite.workspaceId,
      userId: input.userId,
      role: invite.role,
    });

    await tx
      .update(workspaceInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvites.id, invite.id));

    return {
      ok: true,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
    };
  });
}

export async function revokeInvite(input: {
  inviteId: string;
  revokedById: string;
}): Promise<void> {
  await db
    .update(workspaceInvites)
    .set({ revokedAt: new Date(), revokedById: input.revokedById })
    .where(eq(workspaceInvites.id, input.inviteId));
}

// Revokes every still-pending invite in the workspace, optionally excluding
// a role the actor isn't allowed to revoke (mirrors the single-invite
// permission check in revokeInviteAction: an admin actor can't revoke
// admin-level invites, only the owner can).
export async function revokeAllInvites(input: {
  excludeRole?: "admin";
  revokedById: string;
  workspaceId: string;
}): Promise<{ email: string; id: string }[]> {
  const now = new Date();
  const conditions = [
    eq(workspaceInvites.workspaceId, input.workspaceId),
    isNull(workspaceInvites.acceptedAt),
    isNull(workspaceInvites.revokedAt),
    gt(workspaceInvites.expiresAt, now),
  ];
  if (input.excludeRole) {
    conditions.push(ne(workspaceInvites.role, input.excludeRole));
  }

  return db
    .update(workspaceInvites)
    .set({ revokedAt: now, revokedById: input.revokedById })
    .where(and(...conditions))
    .returning({ id: workspaceInvites.id, email: workspaceInvites.email });
}

export async function listPendingInvites(workspaceId: string) {
  const now = new Date();
  return db
    .select({
      id: workspaceInvites.id,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      expiresAt: workspaceInvites.expiresAt,
      createdAt: workspaceInvites.createdAt,
    })
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.workspaceId, workspaceId),
        isNull(workspaceInvites.acceptedAt),
        isNull(workspaceInvites.revokedAt),
        gt(workspaceInvites.expiresAt, now)
      )
    )
    .orderBy(workspaceInvites.createdAt);
}
