"use client";

import { PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { publishPostAction } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";

interface PublishDraftButtonProps {
  postId: string;
  workspaceId: string;
}

export default function PublishDraftButton({
  postId,
  workspaceId,
}: PublishDraftButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    startTransition(async () => {
      const result = await publishPostAction({ postId, workspaceId });
      if (result.success) {
        toast.success("Draft published");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to publish draft.");
      }
    });
  }

  return (
    <Button
      disabled={isPending}
      onClick={handlePublish}
      size="sm"
      type="button"
    >
      <PaperPlaneTiltIcon data-icon="inline-start" />
      {isPending ? "Publishing…" : "Publish"}
    </Button>
  );
}
