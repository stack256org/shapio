"use client";

import { LinkIcon, SpinnerIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { revokeInviteLinkAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SquareAvatar } from "@/components/ui/square-avatar";
import { workspaceRoleLabel } from "@/config/platform";

interface InviteLink {
  createdAt: Date;
  expiresAt: Date | null;
  id: string;
  label: string | null;
  maxUses: number | null;
  role: "owner" | "admin" | "member";
  useCount: number;
}

interface InviteLinksListProps {
  canManage: boolean;
  links: InviteLink[];
  workspaceId: string;
}

export function InviteLinksList({
  links,
  workspaceId,
  canManage,
}: InviteLinksListProps) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<InviteLink | null>(null);

  async function handleConfirmRevoke() {
    if (!pendingRevoke) {
      return;
    }
    const link = pendingRevoke;
    setPendingRevoke(null);
    setRevoking(link.id);
    const result = await revokeInviteLinkAction({
      linkId: link.id,
      workspaceId,
    });
    setRevoking(null);
    if (result.success) {
      toast.success("Invite link deactivated");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to deactivate invite link.");
    }
  }

  return (
    <>
      <div>
        <h2 className="mb-4 text-sm font-semibold tracking-eyebrow text-ir-muted uppercase">
          Invite links{links.length > 0 ? ` (${links.length} active)` : ""}
        </h2>
        {links.length === 0 ? (
          <p className="text-sm text-ir-muted">No active invite links.</p>
        ) : (
          <div className="space-y-px overflow-hidden rounded-ir-card bg-ir-border">
            {links.map((link) => (
              <div
                className="flex flex-col gap-3 bg-ir-surface px-6 py-4 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface sm:flex-row sm:items-center sm:gap-4"
                key={link.id}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <SquareAvatar
                    alt=""
                    className="size-9 bg-ir-primary-light/15 text-ir-primary"
                    fallback={<LinkIcon className="size-4" weight="bold" />}
                    imageUrl={null}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ir-heading">
                      {link.label ?? "Invite link"}
                    </p>
                    <p className="text-xs text-ir-muted">
                      {workspaceRoleLabel(link.role)}
                      {link.maxUses === null
                        ? ` · ${link.useCount} uses`
                        : ` · ${link.useCount}/${link.maxUses} uses`}
                      {link.expiresAt
                        ? ` · Expires ${link.expiresAt.toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <Button
                    className="shrink-0 text-ir-danger hover:opacity-70"
                    disabled={revoking === link.id}
                    onClick={() => setPendingRevoke(link)}
                    size="sm"
                    variant="ghost"
                  >
                    {revoking === link.id ? (
                      <SpinnerIcon
                        className="size-4 animate-spin"
                        data-icon="inline-start"
                      />
                    ) : (
                      <XIcon className="size-4" data-icon="inline-start" />
                    )}
                    <span>Deactivate</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="Deactivate"
        description={`Deactivate "${pendingRevoke?.label ?? "this invite link"}"? Anyone with the link will no longer be able to join.`}
        isPending={!!revoking}
        onConfirm={handleConfirmRevoke}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
        open={!!pendingRevoke}
        title="Deactivate Invite Link"
      />
    </>
  );
}
