"use client";

import {
  CaretUpDownIcon,
  UserCircleDashedIcon,
  UserCirclePlusIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { assignPostAction } from "@/app/actions/posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Assignee {
  email: string;
  id: string;
  image: string | null;
  name: string | null;
}

interface AssigneeSelectProps {
  assignees: Assignee[];
  canEdit: boolean;
  currentAssigneeId: string | null;
  postId: string;
  workspaceId: string;
}

function initials(name: string | null): string {
  if (!name) {
    return "";
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]!.charAt(0).toUpperCase();
  }
  return (
    parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)
  ).toUpperCase();
}

function AssigneeAvatar({ assignee }: { assignee: Assignee }) {
  return (
    <Avatar size="sm">
      {assignee.image && <AvatarImage alt="" src={assignee.image} />}
      <AvatarFallback className="text-[10px] font-semibold">
        {initials(assignee.name) || assignee.email.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

// Brand-Admin-only control to assign feedback to a Team Member. Only
// rendered for workspace members (post-detail-content gates it), matching
// PinButton/VoterListButton — this is an internal triage affordance, never
// shown to the public.
export default function AssigneeSelect({
  postId,
  workspaceId,
  currentAssigneeId,
  canEdit,
  assignees,
}: AssigneeSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const current = assignees.find((a) => a.id === currentAssigneeId) ?? null;

  function handleSelect(assigneeId: string | null) {
    setOpen(false);
    if (assigneeId === currentAssigneeId) {
      return;
    }
    startTransition(async () => {
      const result = await assignPostAction({
        postId,
        workspaceId,
        assigneeId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  // Read-only view (Team Members): show who it's assigned to, or nothing.
  if (!canEdit) {
    return current ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-ir-muted">
        <AssigneeAvatar assignee={current} />
        {current.name || current.email}
      </span>
    ) : null;
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-label={
            current
              ? `Assigned to ${current.name || current.email}. Click to change.`
              : "Assign user"
          }
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-ir-md border px-2 text-xs font-medium transition-colors duration-150 ease-ir-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:cursor-not-allowed disabled:opacity-60",
            current
              ? "border-transparent bg-ir-muted-surface text-ir-heading hover:bg-ir-border/50"
              : "border-dashed border-ir-border text-ir-muted hover:border-ir-primary/40 hover:text-ir-heading"
          )}
          disabled={isPending}
          type="button"
        >
          {current ? (
            <AssigneeAvatar assignee={current} />
          ) : (
            <UserCirclePlusIcon className="size-4 shrink-0" />
          )}
          <span className="max-w-28 truncate">
            {current ? current.name || current.email : "Assign user"}
          </span>
          <CaretUpDownIcon className="size-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 flex-col gap-0 p-0">
        <Command>
          <CommandInput placeholder="Assign to..." />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                data-checked={currentAssigneeId === null}
                onSelect={() => handleSelect(null)}
                value="unassigned"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-ir-border text-ir-muted">
                  <UserCircleDashedIcon className="size-3.5" />
                </span>
                <span className="flex-1 truncate">Unassigned</span>
              </CommandItem>

              {assignees.map((a) => (
                <CommandItem
                  data-checked={a.id === currentAssigneeId}
                  key={a.id}
                  onSelect={() => handleSelect(a.id)}
                  value={`${a.name ?? ""} ${a.email}`}
                >
                  <AssigneeAvatar assignee={a} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ir-heading">
                      {a.name || a.email}
                    </span>
                    {a.name && (
                      <span className="block truncate text-xs text-ir-muted">
                        {a.email}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
