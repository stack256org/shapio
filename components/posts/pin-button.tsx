"use client";

import { PushPinIcon, PushPinSlashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { pinPostAction } from "@/app/actions/posts";

interface PinButtonProps {
  isPinned: boolean;
  postId: string;
  workspaceId: string;
}

export default function PinButton({
  postId,
  workspaceId,
  isPinned,
}: PinButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await pinPostAction({ postId, workspaceId, pin: !isPinned });
      router.refresh();
    });
  }

  return (
    <button
      className="flex cursor-pointer items-center gap-1.5 text-xs text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:opacity-50"
      disabled={isPending}
      onClick={handleToggle}
      type="button"
    >
      {isPinned ? (
        <>
          <PushPinSlashIcon className="size-3.5" />
          Unpin
        </>
      ) : (
        <>
          <PushPinIcon className="size-3.5" />
          Pin
        </>
      )}
    </button>
  );
}
