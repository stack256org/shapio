"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { blockUserAction, unblockUserAction } from "@/app/actions/moderation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import type { BlockedUserRow } from "@/lib/moderation/queries";

interface Props {
  blockedUsers: BlockedUserRow[];
  workspaceId: string;
}

export function BlockedUsersSection({ workspaceId, blockedUsers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [unblockTarget, setUnblockTarget] = useState<BlockedUserRow | null>(
    null
  );

  function handleBlock(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    startTransition(async () => {
      const result = await blockUserAction({
        workspaceId,
        email: email.trim(),
        reason: reason.trim() || undefined,
      });

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      toast.success(`${email.trim()} has been blocked`);
      setEmail("");
      setReason("");
      router.refresh();
    });
  }

  function handleUnblockConfirm() {
    if (!unblockTarget) {
      return;
    }
    startTransition(async () => {
      const result = await unblockUserAction({
        blockedId: unblockTarget.id,
        workspaceId,
      });
      setUnblockTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("User unblocked");
      router.refresh();
    });
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-ir-heading">Blocked users</h2>
        <p className="mt-0.5 text-xs text-ir-muted">
          Blocked users cannot post or comment in this workspace.
        </p>
      </div>

      {/* Block form */}
      <form
        className="mb-4 rounded-ir-card border border-ir-border bg-ir-surface p-4 shadow-ir-xs"
        onSubmit={handleBlock}
      >
        <p className="mb-3 text-sm font-medium text-ir-heading">Block a user</p>
        <div className="grid gap-3">
          <div>
            <label
              className="mb-1 block text-xs font-medium text-ir-heading"
              htmlFor="block-email"
            >
              Email address
            </label>
            <Input
              autoComplete="off"
              disabled={isPending}
              id="block-email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-ir-heading"
              htmlFor="block-reason"
            >
              Reason{" "}
              <span className="font-normal text-ir-muted">(optional)</span>
            </label>
            <Input
              autoComplete="off"
              disabled={isPending}
              id="block-reason"
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Spam, abuse, etc."
              value={reason}
            />
          </div>
          {formError && <p className="text-xs text-ir-danger">{formError}</p>}
          <div className="flex justify-end">
            <Button
              disabled={isPending || !email.trim()}
              type="submit"
              variant="destructive"
            >
              {isPending ? "Blocking…" : "Block user"}
            </Button>
          </div>
        </div>
      </form>

      {/* Blocked list */}
      {blockedUsers.length === 0 ? (
        <div className="rounded-ir-card border border-dashed border-ir-border p-8 text-center">
          <p className="text-sm text-ir-muted">No blocked users.</p>
        </div>
      ) : (
        <div className="divide-y divide-ir-border overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          {blockedUsers.map((bu) => (
            <div
              className="flex flex-col gap-2 p-4 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface sm:flex-row sm:items-center sm:gap-4"
              key={bu.id}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ir-heading">
                  {bu.userName ?? bu.userEmail ?? "Unknown"}
                </p>
                {bu.userName && bu.userEmail && (
                  <p className="text-xs text-ir-muted">{bu.userEmail}</p>
                )}
                {bu.reason && (
                  <p className="mt-0.5 text-xs text-ir-muted">
                    Reason: {bu.reason}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-ir-muted">
                  Blocked{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                  }).format(new Date(bu.createdAt))}
                  {bu.blockedBy?.email
                    ? ` by ${bu.blockedBy.name ?? bu.blockedBy.email}`
                    : ""}
                </p>
              </div>
              <Button
                disabled={isPending}
                onClick={() => setUnblockTarget(bu)}
                size="xs"
                type="button"
                variant="outline"
              >
                Unblock
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        confirmLabel="Unblock"
        description={`Remove block for ${unblockTarget?.userEmail ?? unblockTarget?.userName ?? "this user"}? They will be able to post and comment again.`}
        isPending={isPending}
        onConfirm={handleUnblockConfirm}
        onOpenChange={(open) => !open && setUnblockTarget(null)}
        open={!!unblockTarget}
        title="Unblock user"
        variant="default"
      />
    </section>
  );
}
