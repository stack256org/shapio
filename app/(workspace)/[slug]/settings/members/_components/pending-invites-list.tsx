"use client";

import { EnvelopeIcon, SpinnerIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  revokeAllInvitesAction,
  revokeInviteAction,
} from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SquareAvatar } from "@/components/ui/square-avatar";
import { workspaceRoleLabel } from "@/config/platform";

interface PendingInvite {
  createdAt: Date;
  email: string;
  expiresAt: Date;
  id: string;
  role: "owner" | "admin" | "member";
}

interface PendingInvitesListProps {
  actorRole: "owner" | "admin" | "member";
  canManage: boolean;
  invites: PendingInvite[];
  workspaceId: string;
}

function formatExpiry(date: Date): string {
  const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) {
    return "Expiring soon";
  }
  if (diff === 1) {
    return "Expires in 1 day";
  }
  return `Expires in ${diff} days`;
}

export function PendingInvitesList({
  invites,
  workspaceId,
  canManage,
  actorRole,
}: PendingInvitesListProps) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<PendingInvite | null>(
    null
  );
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  async function handleConfirmRevoke() {
    if (!pendingRevoke) {
      return;
    }
    const invite = pendingRevoke;
    setPendingRevoke(null);
    setRevoking(invite.id);
    const result = await revokeInviteAction({
      inviteId: invite.id,
      workspaceId,
    });
    setRevoking(null);
    if (result.success) {
      toast.success("Invitation revoked");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to revoke invitation.");
    }
  }

  // Same per-invite rule the row actions already apply: an admin actor can
  // revoke everything except admin-level invites, only the owner can revoke
  // those. "Revoke All" only ever acts on invites the actor is allowed to
  // touch — the rest are left for the owner.
  const revocableInvites = invites.filter(
    (invite) => canManage && (actorRole === "owner" || invite.role !== "admin")
  );
  const hasWithheldAdminInvites =
    revocableInvites.length < invites.length && actorRole !== "owner";

  async function handleConfirmRevokeAll() {
    setRevokeAllOpen(false);
    setRevokingAll(true);
    const result = await revokeAllInvitesAction({ workspaceId });
    setRevokingAll(false);
    if (result.success) {
      toast.success(
        result.data.count === 1
          ? "Invitation revoked"
          : `${result.data.count} invitations revoked`
      );
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to revoke invitations.");
    }
  }

  return (
    <>
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold tracking-eyebrow text-ir-muted uppercase">
            Pending invitations
            {invites.length > 0 ? ` (${invites.length})` : ""}
          </h2>
          {revocableInvites.length > 0 && (
            <Button
              className="shrink-0 text-ir-danger hover:opacity-70"
              disabled={revokingAll}
              onClick={() => setRevokeAllOpen(true)}
              size="sm"
              variant="ghost"
            >
              {revokingAll ? (
                <SpinnerIcon
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <XIcon className="size-4" data-icon="inline-start" />
              )}
              <span>
                Revoke All
                {revocableInvites.length > 1
                  ? ` (${revocableInvites.length})`
                  : ""}
              </span>
            </Button>
          )}
        </div>
        {invites.length === 0 ? (
          <p className="text-sm text-ir-muted">No pending invitations.</p>
        ) : (
          <div className="space-y-px overflow-hidden rounded-ir-card bg-ir-border">
            {invites.map((invite) => {
              const canRevoke =
                canManage && (actorRole === "owner" || invite.role !== "admin");
              return (
                <div
                  className="flex flex-col gap-3 bg-ir-surface px-6 py-4 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface sm:flex-row sm:items-center sm:gap-4"
                  key={invite.id}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <SquareAvatar
                      alt=""
                      className="size-9 bg-ir-warning/10 text-ir-warning"
                      fallback={
                        <EnvelopeIcon className="size-4" weight="bold" />
                      }
                      imageUrl={null}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ir-heading">
                        {invite.email}
                      </p>
                      <p className="text-xs text-ir-muted">
                        {workspaceRoleLabel(invite.role)} ·{" "}
                        {formatExpiry(invite.expiresAt)}
                      </p>
                    </div>
                  </div>
                  {canRevoke && (
                    <Button
                      className="shrink-0 text-ir-danger hover:opacity-70"
                      disabled={revoking === invite.id}
                      onClick={() => setPendingRevoke(invite)}
                      size="sm"
                      variant="ghost"
                    >
                      {revoking === invite.id ? (
                        <SpinnerIcon
                          className="size-4 animate-spin"
                          data-icon="inline-start"
                        />
                      ) : (
                        <XIcon className="size-4" data-icon="inline-start" />
                      )}
                      <span>Revoke</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="Revoke"
        description={`Revoke the invitation sent to ${pendingRevoke?.email ?? "this person"}? They will no longer be able to use this invite link.`}
        isPending={!!revoking}
        onConfirm={handleConfirmRevoke}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
        open={!!pendingRevoke}
        title="Revoke Invitation"
      />

      <ConfirmDialog
        confirmLabel="Revoke All"
        description={`Revoke ${revocableInvites.length} pending invitation${revocableInvites.length === 1 ? "" : "s"}? They will no longer be able to use their invite links.${hasWithheldAdminInvites ? " Admin-level invitations must be revoked individually by the workspace owner." : ""}`}
        isPending={revokingAll}
        onConfirm={handleConfirmRevokeAll}
        onOpenChange={setRevokeAllOpen}
        open={revokeAllOpen}
        title="Revoke All Invitations"
      />
    </>
  );
}
