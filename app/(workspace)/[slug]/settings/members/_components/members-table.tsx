"use client";

import { DotsThreeIcon, SpinnerIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  changeRoleAction,
  removeMemberAction,
  transferOwnershipAction,
} from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SquareAvatar } from "@/components/ui/square-avatar";
import {
  WORKSPACE_ADMIN,
  WORKSPACE_MEMBER,
  WORKSPACE_OWNER,
  workspaceRoleLabel,
} from "@/config/platform";
import { InviteMemberDialog } from "./invite-member-dialog";

interface Member {
  id: string;
  joinedAt: Date;
  role: "owner" | "admin" | "member";
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
  userId: string;
}

interface MembersTableProps {
  actorRole: "owner" | "admin" | "member";
  actorUserId: string;
  canInviteAdmin: boolean;
  isOrbitAdmin: boolean;
  members: Member[];
  smtpConfigured: boolean;
  workspaceId: string;
}

interface PendingConfirm {
  action: () => Promise<{
    success: boolean;
    error?: string;
    redirectTo?: string;
  }>;
  confirmLabel: string;
  description: string;
  memberId: string;
  successMessage: string;
  title: string;
}

// Owner and admin both display as "Brand Admin" (workspaceRoleLabel) —
// ownership is a property, not a separate role (PLATFORM.md §2) — so they
// share one style here too; two colors under one label reads as a bug, not
// a distinction.
const ROLE_BADGE: Record<string, string> = {
  owner: "bg-ir-primary-light/15 text-ir-primary",
  admin: "bg-ir-primary-light/15 text-ir-primary",
  member: "bg-ir-muted-surface text-ir-muted",
};

type RoleFilter = "all" | "brand_admin" | "team_member";

export function MembersTable({
  members,
  actorUserId,
  actorRole,
  workspaceId,
  canInviteAdmin,
  isOrbitAdmin,
  smtpConfigured,
}: MembersTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return members.filter((member) => {
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "team_member" && member.role === WORKSPACE_MEMBER) ||
        (roleFilter === "brand_admin" && member.role !== WORKSPACE_MEMBER);
      if (!matchesRole) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        (member.user.name?.toLowerCase().includes(query) ?? false) ||
        member.user.email.toLowerCase().includes(query)
      );
    });
  }, [members, search, roleFilter]);

  async function handleAction(
    memberId: string,
    action: () => Promise<{
      success: boolean;
      error?: string;
      redirectTo?: string;
    }>
  ) {
    setLoadingId(memberId);
    setErrors((prev) => ({ ...prev, [memberId]: "" }));
    const result = await action();
    setLoadingId(null);
    if (!result.success && result.error) {
      setErrors((prev) => ({ ...prev, [memberId]: result.error! }));
    } else if (result.redirectTo) {
      router.replace(result.redirectTo);
    } else {
      router.refresh();
    }
  }

  async function handleConfirmedAction() {
    if (!pendingConfirm) {
      return;
    }
    const { memberId, action, successMessage } = pendingConfirm;
    setPendingConfirm(null);
    setLoadingId(memberId);
    const result = await action();
    setLoadingId(null);
    if (!result.success && result.error) {
      toast.error(result.error);
    } else {
      toast.success(successMessage);
      if (result.redirectTo) {
        router.replace(result.redirectTo);
      } else {
        router.refresh();
      }
    }
  }

  return (
    <div className="rounded-ir-card border border-ir-border bg-ir-surface p-5 shadow-ir-xs sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ir-heading">Members</h2>
          <p className="mt-0.5 text-sm text-ir-muted">
            {members.length} {members.length === 1 ? "person" : "people"} in
            this workspace
          </p>
        </div>
        <InviteMemberDialog
          canInviteAdmin={canInviteAdmin}
          isOrbitAdmin={isOrbitAdmin}
          smtpConfigured={smtpConfigured}
          workspaceId={workspaceId}
        />
      </div>

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <SearchInput
          aria-label="Search members"
          className="sm:max-w-xs"
          onSearch={setSearch}
          placeholder="Search by name or email"
        />
        <Select
          onValueChange={(v) => setRoleFilter(v as RoleFilter)}
          value={roleFilter}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="brand_admin">Brand Admin</SelectItem>
            <SelectItem value="team_member">Team Member</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredMembers.length === 0 ? (
        <p className="rounded-ir-sm border border-dashed border-ir-border py-8 text-center text-sm text-ir-muted">
          No members match your search.
        </p>
      ) : (
        <div className="overflow-hidden rounded-ir-card border border-ir-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ir-border bg-ir-muted-surface/60">
                <th className="px-4 py-2.5 text-left text-2xs font-semibold tracking-eyebrow text-ir-muted uppercase">
                  Member
                </th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold tracking-eyebrow text-ir-muted uppercase">
                  Role
                </th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold tracking-eyebrow text-ir-muted uppercase">
                  Joined
                </th>
                <th className="w-12 px-4 py-2.5 text-left text-2xs font-semibold tracking-eyebrow text-ir-muted uppercase">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ir-border">
              {filteredMembers.map((member) => {
                const isSelf = member.userId === actorUserId;
                const isOwner = member.role === WORKSPACE_OWNER;
                const canChangeRole =
                  (actorRole === WORKSPACE_OWNER && !isOwner) ||
                  (actorRole === WORKSPACE_ADMIN &&
                    member.role === WORKSPACE_MEMBER &&
                    !isSelf);
                const canRemove =
                  !isOwner &&
                  !isSelf &&
                  (actorRole === WORKSPACE_OWNER ||
                    (actorRole === WORKSPACE_ADMIN &&
                      member.role === WORKSPACE_MEMBER));
                const canTransfer =
                  actorRole === WORKSPACE_OWNER && !isOwner && !isSelf;
                const showMenu = canChangeRole || canRemove || canTransfer;

                return (
                  <tr
                    className="transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface"
                    key={member.id}
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <SquareAvatar
                          alt={member.user.name ?? member.user.email}
                          className="size-9 shrink-0 bg-ir-muted-surface text-sm font-semibold text-ir-muted uppercase"
                          fallback={(
                            member.user.name || member.user.email
                          ).charAt(0)}
                          imageUrl={member.user.image}
                        />
                        <div className="min-w-0">
                          {member.user.name && (
                            <p className="truncate text-sm font-medium text-ir-heading">
                              {member.user.name}
                              {isSelf && (
                                <span className="ml-1.5 text-xs font-normal text-ir-muted">
                                  (you)
                                </span>
                              )}
                            </p>
                          )}
                          <p
                            className={`truncate text-sm ${member.user.name ? "text-ir-muted" : "font-medium text-ir-heading"}`}
                          >
                            {member.user.email}
                            {!member.user.name && isSelf && (
                              <span className="ml-1.5 text-xs font-normal text-ir-muted">
                                (you)
                              </span>
                            )}
                          </p>
                          {errors[member.id] && (
                            <p className="mt-0.5 text-xs text-ir-danger">
                              {errors[member.id]}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex shrink-0 items-center rounded-ir-full px-2 py-0.5 text-[11px] font-medium ${ROLE_BADGE[member.role]}`}
                      >
                        {workspaceRoleLabel(member.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ir-muted">
                      {format(member.joinedAt, "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      {showMenu && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-label={`Actions for ${member.user.name ?? member.user.email}`}
                              className="text-ir-muted hover:text-ir-heading"
                              disabled={loadingId === member.id}
                              size="icon-xs"
                              variant="ghost"
                            >
                              {loadingId === member.id ? (
                                <SpinnerIcon className="size-4 animate-spin" />
                              ) : (
                                <DotsThreeIcon
                                  className="size-4"
                                  weight="bold"
                                />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canChangeRole && (
                              <>
                                {member.role === WORKSPACE_MEMBER && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleAction(member.id, () =>
                                        changeRoleAction({
                                          memberId: member.id,
                                          workspaceId,
                                          role: "admin",
                                        })
                                      )
                                    }
                                  >
                                    Promote to Brand Admin
                                  </DropdownMenuItem>
                                )}
                                {member.role === WORKSPACE_ADMIN && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleAction(member.id, () =>
                                        changeRoleAction({
                                          memberId: member.id,
                                          workspaceId,
                                          role: "member",
                                        })
                                      )
                                    }
                                  >
                                    Change to Team Member
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {canTransfer && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setPendingConfirm({
                                    title: "Transfer Ownership",
                                    description: `Transfer workspace ownership to ${member.user.name ?? member.user.email}? You will remain a Brand Admin but lose ownership of this workspace.`,
                                    memberId: member.id,
                                    confirmLabel: "Transfer",
                                    action: () =>
                                      transferOwnershipAction({
                                        targetMemberId: member.id,
                                        workspaceId,
                                      }),
                                    successMessage:
                                      "Ownership transferred successfully",
                                  })
                                }
                              >
                                Transfer ownership
                              </DropdownMenuItem>
                            )}
                            {(canChangeRole || canTransfer) && canRemove && (
                              <DropdownMenuSeparator />
                            )}
                            {canRemove && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setPendingConfirm({
                                    title: "Remove Member",
                                    description: `Remove ${member.user.name ?? member.user.email} from this workspace? They will lose all access immediately.`,
                                    memberId: member.id,
                                    confirmLabel: "Remove",
                                    action: () =>
                                      removeMemberAction({
                                        memberId: member.id,
                                        workspaceId,
                                      }),
                                    successMessage:
                                      "Member removed successfully",
                                  })
                                }
                                variant="destructive"
                              >
                                Remove member
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        confirmLabel={pendingConfirm?.confirmLabel ?? "Confirm"}
        description={pendingConfirm?.description ?? ""}
        isPending={!!loadingId}
        onConfirm={handleConfirmedAction}
        onOpenChange={(open) => !open && setPendingConfirm(null)}
        open={!!pendingConfirm}
        title={pendingConfirm?.title ?? ""}
      />
    </div>
  );
}
