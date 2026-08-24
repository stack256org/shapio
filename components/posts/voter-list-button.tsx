"use client";

import { useState } from "react";
import VoterListModal from "@/components/voting/voter-list-modal";

interface VoterListButtonProps {
  postId: string;
  voteCount: number;
}

export default function VoterListButton({
  postId,
  voteCount,
}: VoterListButtonProps) {
  const [open, setOpen] = useState(false);

  if (voteCount === 0) {
    return null;
  }

  return (
    <>
      <button
        className="rounded-ir-xs text-2xs text-ir-muted underline underline-offset-2 transition-colors duration-150 ease-ir-standard hover:text-ir-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
        onClick={() => setOpen(true)}
        type="button"
      >
        See who voted
      </button>

      {open && (
        <VoterListModal
          onClose={() => setOpen(false)}
          postId={postId}
          voteCount={voteCount}
        />
      )}
    </>
  );
}
