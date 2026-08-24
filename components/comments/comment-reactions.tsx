"use client";

import { SmileyIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EmbedAuthDialog } from "@/components/embed/embed-auth-dialog";
import { useIsEmbed } from "@/components/embed/use-is-embed";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { REACTION_EMOJIS } from "@/config/platform";
import { embedFetch } from "@/lib/embed/fetch";
import { useEmbedReactionCorrections } from "@/lib/embed/personalization-context";
import { useEmbedSignedIn } from "@/lib/embed/use-embed-signed-in";
import type { CommentApi, ReactionGroup } from "./types";

function formatReactorNames(names: string[]): string {
  if (names.length <= 1) {
    return names[0] ?? "";
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

interface CommentReactionsProps {
  api?: CommentApi;
  commentId: string;
  initialReactions: ReactionGroup[];
  isSignedIn: boolean;
}

export default function CommentReactions({
  api,
  commentId,
  initialReactions,
  isSignedIn,
}: CommentReactionsProps) {
  const commentBaseUrl = api?.commentBaseUrl ?? "/api/comments";
  const router = useRouter();
  const isEmbed = useIsEmbed();
  const [reactions, setReactions] = useState<ReactionGroup[]>(initialReactions);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingEmoji, setPendingEmoji] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useEmbedSignedIn(isEmbed, isSignedIn);
  const [authOpen, setAuthOpen] = useState(false);
  const [afterAuthEmoji, setAfterAuthEmoji] = useState<string | null>(null);

  // Server-rendered `hasReacted` is computed from a cookie session, always
  // false for a bearer-authenticated embed visitor — correct it once at
  // mount, the same way VoteButton corrects `hasVoted` (see
  // lib/embed/personalization-context.tsx). Guarded by a ref: the
  // personalization fetch is re-triggered by a sign-in that can happen in
  // this SAME flow (e.g. sign in via this row's own dialog, which
  // immediately reacts) and can resolve AFTER that reaction's own request —
  // a slower correction response carrying pre-reaction data would otherwise
  // clobber it. Once the visitor has reacted locally, that action is
  // authoritative for the rest of this component's lifetime.
  const hasLocalActionRef = useRef(false);
  const correctedReactions = useEmbedReactionCorrections(
    commentId,
    initialReactions
  );
  useEffect(() => {
    if (hasLocalActionRef.current) {
      return;
    }
    setReactions(correctedReactions);
  }, [correctedReactions]);

  async function castReaction(emoji: string) {
    hasLocalActionRef.current = true;
    setPendingEmoji(emoji);
    setShowPicker(false);

    // Optimistic update
    const existing = reactions.find((r) => r.emoji === emoji);
    if (existing) {
      if (existing.hasReacted) {
        // Remove
        setReactions((prev) =>
          prev
            .map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count - 1,
                    hasReacted: false,
                    reactorNames: r.reactorNames.filter((n) => n !== "You"),
                  }
                : r
            )
            .filter((r) => r.count > 0)
        );
      } else {
        // Add to existing
        setReactions((prev) =>
          prev.map((r) =>
            r.emoji === emoji
              ? {
                  ...r,
                  count: r.count + 1,
                  hasReacted: true,
                  reactorNames: [...r.reactorNames, "You"],
                }
              : r
          )
        );
      }
    } else {
      // New reaction
      setReactions((prev) => [
        ...prev,
        { emoji, count: 1, hasReacted: true, reactorNames: ["You"] },
      ]);
    }

    try {
      const res = await embedFetch(`${commentBaseUrl}/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      // A session can go stale between page load and this click (expiry, a
      // sign-out elsewhere) — reopen the in-place prompt instead of leaving
      // the visitor stuck behind a silently-reverted reaction.
      if (res.status === 401 && isEmbed) {
        setReactions(initialReactions);
        setSignedIn(false);
        setAfterAuthEmoji(emoji);
        setAuthOpen(true);
        return;
      }
      if (!res.ok) {
        setReactions(initialReactions);
      }
    } catch {
      // Revert on error - refetch would be ideal but keep simple
      setReactions(initialReactions);
    } finally {
      setPendingEmoji(null);
    }
  }

  function handleReact(emoji: string) {
    if (!signedIn) {
      if (isEmbed) {
        setAfterAuthEmoji(emoji);
        setAuthOpen(true);
      }
      return;
    }
    if (pendingEmoji) {
      return;
    }
    castReaction(emoji);
  }

  function handleAddReactionClick() {
    if (!signedIn) {
      setAuthOpen(true);
      return;
    }
    setShowPicker((v) => !v);
  }

  function handleAuthenticated() {
    setSignedIn(true);
    router.refresh();
    if (afterAuthEmoji) {
      const emoji = afterAuthEmoji;
      setAfterAuthEmoji(null);
      castReaction(emoji);
    } else {
      setShowPicker(true);
    }
  }

  const canReact = signedIn || isEmbed;

  useEffect(() => {
    if (!showPicker) {
      return;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowPicker(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showPicker]);

  return (
    <div className="relative mt-2 flex flex-wrap items-center gap-1">
      {reactions.map((r) => {
        const pill = (
          <button
            className={`inline-flex cursor-pointer items-center gap-1 rounded-ir-full border px-2 py-0.5 text-xs transition-colors duration-150 ease-ir-standard focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ir-primary/40 disabled:opacity-60 ${
              r.hasReacted
                ? "border-ir-primary/40 bg-ir-primary-light/15 text-ir-primary"
                : "border-ir-border bg-transparent text-ir-body hover:border-ir-primary/30"
            }`}
            disabled={!canReact || !!pendingEmoji}
            onClick={() => handleReact(r.emoji)}
            type="button"
          >
            <span>{r.emoji}</span>
            <span className="tabular-nums">{r.count}</span>
          </button>
        );

        if (r.reactorNames.length === 0) {
          return <span key={r.emoji}>{pill}</span>;
        }

        return (
          <Tooltip key={r.emoji}>
            <TooltipTrigger asChild>{pill}</TooltipTrigger>
            <TooltipContent>
              {formatReactorNames(r.reactorNames)}
            </TooltipContent>
          </Tooltip>
        );
      })}

      {canReact && (
        <div className="relative">
          <button
            aria-expanded={showPicker}
            aria-label="Add reaction"
            className="inline-flex cursor-pointer items-center gap-1 rounded-ir-full border border-ir-border px-2 py-0.5 text-xs text-ir-muted transition-colors duration-150 ease-ir-standard hover:border-ir-primary/30 hover:text-ir-heading focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ir-primary/40"
            disabled={!!pendingEmoji}
            onClick={handleAddReactionClick}
            type="button"
          >
            <SmileyIcon className="size-3" />
          </button>

          {showPicker && signedIn && (
            <>
              <button
                aria-label="Close emoji picker"
                className="fixed inset-0 z-10 cursor-pointer"
                onClick={() => setShowPicker(false)}
                type="button"
              />
              <div className="absolute bottom-full left-0 z-20 mb-1.5 flex gap-1 rounded-ir-md border border-ir-border bg-ir-surface p-1.5 shadow-ir-md">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    className="cursor-pointer rounded-ir-sm p-1 text-base leading-none transition-colors duration-100 ease-ir-standard hover:bg-ir-muted-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ir-primary/40"
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    title={emoji}
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {isEmbed && (
        <EmbedAuthDialog
          onAuthenticated={handleAuthenticated}
          onOpenChange={setAuthOpen}
          open={authOpen}
        />
      )}
    </div>
  );
}
