"use client";

import { CaretUpIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EmbedAuthDialog } from "@/components/embed/embed-auth-dialog";
import { useIsEmbed } from "@/components/embed/use-is-embed";
import { PortalVerifyDialog } from "@/components/portal/portal-verify-dialog";
import { embedFetch } from "@/lib/embed/fetch";
import { useEmbedVoteState } from "@/lib/embed/personalization-context";
import { useEmbedSignedIn } from "@/lib/embed/use-embed-signed-in";

interface VoteButtonProps {
  // Smaller, borderless, label-less rendering for dense card/table layouts —
  // same voting behavior, just less chrome.
  compact?: boolean;
  initialCount: number;
  initialHasVoted: boolean;
  isArchived?: boolean;
  // True when the viewer may vote right now — a signed-in account OR an
  // accountless portal visitor who has already verified their email. Anyone
  // else is prompted to verify in place rather than sent to /signin.
  isSignedIn: boolean;
  postId: string;
}

export default function VoteButton({
  postId,
  initialCount,
  initialHasVoted,
  isSignedIn,
  isArchived = false,
  compact = false,
}: VoteButtonProps) {
  const router = useRouter();
  const isEmbed = useIsEmbed();
  const shouldReduceMotion = useReducedMotion();
  const [count, setCount] = useState(initialCount);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [isPending, setIsPending] = useState(false);
  const [signedIn, setSignedIn] = useEmbedSignedIn(isEmbed, isSignedIn);
  const [authOpen, setAuthOpen] = useState(false);

  // Server-rendered `initialHasVoted` is computed from a cookie session,
  // which is always null for an embed visitor authenticated via bearer
  // token — always shows "not voted" on reload even when they already have.
  // Correct it once the embed personalization fetch resolves (no-op outside
  // embed, or before any provider is wired up a page — see
  // lib/embed/personalization-context.tsx). Guarded by a ref rather than
  // applied unconditionally: the personalization fetch can be triggered by
  // this SAME sign-in (the provider re-fetches on every token change, not
  // just at mount) and can resolve AFTER a vote the visitor casts in the
  // same flow (e.g. sign in via this button's own dialog, which immediately
  // calls castVote()) — without the guard, a slower correction response
  // carrying pre-vote data would clobber the just-cast vote back to
  // "not voted". Once the visitor has interacted locally, their own action
  // is authoritative for the rest of this component's lifetime.
  const hasLocalActionRef = useRef(false);
  const correctedHasVoted = useEmbedVoteState(postId, initialHasVoted);
  useEffect(() => {
    if (hasLocalActionRef.current) {
      return;
    }
    setHasVoted(correctedHasVoted);
  }, [correctedHasVoted]);

  // `count` starts from `initialCount` but — unlike `hasVoted` above — was
  // never re-synced when it changes on a later render (e.g. a router.refresh()
  // after this post gets merged into/out of, moving votes and changing the
  // server-computed count elsewhere while this button stays mounted). Same
  // guard as above: skip the resync once this specific button has taken a
  // local action, so a slower-arriving stale render can't clobber an
  // optimistic vote/unvote the visitor just made here.
  useEffect(() => {
    if (hasLocalActionRef.current) {
      return;
    }
    setCount(initialCount);
  }, [initialCount]);

  const disabled = isArchived || isPending;
  const tooltip = isArchived ? "This board is archived" : undefined;

  async function castVote() {
    hasLocalActionRef.current = true;
    const wasVoted = hasVoted;
    const prevCount = count;
    setHasVoted(!wasVoted);
    setCount(wasVoted ? Math.max(0, count - 1) : count + 1);
    setIsPending(true);

    try {
      const method = wasVoted ? "DELETE" : "POST";
      const res = await embedFetch(`/api/posts/${postId}/vote`, { method });

      if (!res.ok) {
        // Revert optimistic update
        setHasVoted(wasVoted);
        setCount(prevCount);
        // A session can go stale between page load and this click (expiry, a
        // sign-out elsewhere) — the local `signedIn` flag has no way to know
        // that on its own. Rather than leave the visitor stuck behind a
        // generic error until they manually reload, treat 401 as "actually
        // signed out" and reopen the in-place prompt right away.
        if (res.status === 401) {
          setSignedIn(false);
          setAuthOpen(true);
          return;
        }
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Something went wrong.");
        return;
      }

      if (!wasVoted) {
        const data = await res.json().catch(() => ({}));
        if (typeof data.voteCount === "number") {
          setCount(data.voteCount);
        }
      }
    } catch {
      setHasVoted(wasVoted);
      setCount(prevCount);
      toast.error("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  function handleClick() {
    if (disabled) {
      return;
    }

    if (!signedIn) {
      // Stay where they are — verify in place, then vote automatically. In the
      // widget that's the account-based embed sign-in; on the Public Portal
      // it's accountless email verification. Either way the visitor never
      // leaves the page and never loses their click.
      setAuthOpen(true);
      return;
    }

    castVote();
  }

  function handleAuthenticated() {
    setSignedIn(true);
    router.refresh();
    castVote();
  }

  const authDialog = isEmbed ? (
    <EmbedAuthDialog
      onAuthenticated={handleAuthenticated}
      onOpenChange={setAuthOpen}
      open={authOpen}
    />
  ) : (
    <PortalVerifyDialog
      action="vote"
      onOpenChange={setAuthOpen}
      onVerified={handleAuthenticated}
      open={authOpen}
    />
  );

  if (compact) {
    return (
      <>
        <motion.button
          aria-busy={isPending}
          aria-label={hasVoted ? "Remove vote" : "Vote for this post"}
          aria-pressed={hasVoted}
          className={`flex flex-col items-center gap-0.5 rounded-ir-sm px-2 py-1.5 transition-colors duration-150 ease-ir-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 ${
            disabled && !isPending
              ? "cursor-not-allowed text-ir-muted opacity-50"
              : hasVoted
                ? "cursor-pointer bg-ir-primary-light/15 text-ir-primary hover:bg-ir-primary-light/25"
                : "cursor-pointer text-ir-muted hover:bg-ir-muted-surface hover:text-ir-heading"
          } ${isPending ? "opacity-70" : ""}`}
          disabled={disabled}
          onClick={handleClick}
          title={tooltip}
          type="button"
          whileTap={disabled || shouldReduceMotion ? undefined : { scale: 0.9 }}
        >
          <CaretUpIcon
            className="size-4"
            weight={hasVoted ? "bold" : "regular"}
          />
          <span className="text-xs font-semibold tabular-nums">{count}</span>
        </motion.button>
        {authDialog}
      </>
    );
  }

  return (
    <>
      <motion.button
        aria-busy={isPending}
        aria-label={hasVoted ? "Remove vote" : "Vote for this post"}
        aria-pressed={hasVoted}
        className={`flex flex-col items-center gap-0.5 rounded-ir-sm border px-2.5 py-1.5 transition-colors duration-150 ease-ir-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 ${
          disabled && !isPending
            ? "cursor-not-allowed border-ir-border text-ir-muted opacity-50"
            : hasVoted
              ? "cursor-pointer border-ir-primary/40 bg-ir-primary-light/15 text-ir-primary hover:bg-ir-primary-light/25"
              : "cursor-pointer border-ir-border text-ir-muted hover:border-ir-primary/30 hover:text-ir-heading"
        } ${isPending ? "opacity-70" : ""}`}
        disabled={disabled}
        onClick={handleClick}
        title={tooltip}
        type="button"
        whileTap={disabled ? undefined : { scale: 0.9 }}
      >
        <CaretUpIcon
          className="size-4"
          weight={hasVoted ? "bold" : "regular"}
        />
        <span className="text-sm font-semibold tabular-nums">{count}</span>
      </motion.button>
      {authDialog}
    </>
  );
}
