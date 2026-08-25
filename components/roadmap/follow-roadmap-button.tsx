"use client";

import { BellIcon, BellRingingIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleRoadmapFollowAction } from "@/app/actions/roadmap";

interface FollowRoadmapButtonProps {
  initialFollowing: boolean;
  isSignedIn: boolean;
  workspaceId: string;
}

export function FollowRoadmapButton({
  workspaceId,
  initialFollowing,
  isSignedIn,
}: FollowRoadmapButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    // Following requires sign-in — send visitors to sign in first (Feature 09).
    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    const next = !following;
    startTransition(async () => {
      const result = await toggleRoadmapFollowAction({
        workspaceId,
        follow: next,
      });
      if (result.success) {
        setFollowing(next);
        toast.success(
          next ? "You're following this roadmap" : "Unfollowed roadmap"
        );
      } else if (result.code === "UNAUTHENTICATED") {
        router.push("/login");
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <button
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-ir-button border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-ir-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        following
          ? "border-ir-border bg-ir-muted-surface text-ir-heading"
          : "border-ir-border text-ir-muted hover:bg-ir-muted-surface hover:text-ir-heading"
      }`}
      disabled={isPending}
      onClick={handleClick}
      type="button"
    >
      {following ? (
        <BellRingingIcon className="size-4" />
      ) : (
        <BellIcon className="size-4" />
      )}
      {following ? "Following" : "Follow"}
    </button>
  );
}
