"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { embedFetch } from "@/lib/embed/fetch";
import { getEmbedToken, onEmbedTokenChange } from "@/lib/embed/token";

// Client-side correction for "what's true about me on this page" in embed
// mode — the single, centralized consumer-facing half of the personalization
// layer (server half: app/api/embed/personalization/route.ts). Any
// server-rendered isOwn/hasVoted/hasReacted/etc. prop is a safe "assume
// signed out" default computed from a cookie session that's always null in
// embed; this fetches the bearer-resolved truth once per page mount and lets
// consumers prefer it once it's ready. Pages that don't wrap their content in
// this provider (or non-embed pages) get the untouched default context value
// below, so every consumer hook safely falls back to its existing prop with
// zero provider present — retrofitting a consumer never depends on every
// page being wired first.
interface PersonalizationData {
  isModerator: boolean;
  ownCommentIds: Set<string>;
  // Keyed by comment id OR changelogEntryId (both globally unique, like
  // ownCommentIds) — one map covers "reacted to this comment" and "reacted
  // to this changelog entry" without a separate field for each.
  reactedEmojisById: Map<string, Set<string>>;
  // null until the fetch resolves — distinct from `false` (explicitly
  // unsubscribed), same as every other field's "not corrected yet" default.
  subscribedChangelog: boolean | null;
  votedPostIds: Set<string>;
}

interface PersonalizationContextValue {
  data: PersonalizationData;
  ready: boolean;
}

const DEFAULT_VALUE: PersonalizationContextValue = {
  ready: false,
  data: {
    votedPostIds: new Set(),
    ownCommentIds: new Set(),
    reactedEmojisById: new Map(),
    subscribedChangelog: null,
    isModerator: false,
  },
};

const EmbedPersonalizationContext =
  createContext<PersonalizationContextValue>(DEFAULT_VALUE);

interface EmbedPersonalizationProviderProps {
  changelogEntryId?: string;
  // Plural, distinct from changelogEntryId above — set on the changelog
  // list page, which renders one ChangelogReactions per entry (no comment
  // section) rather than a single entry's detail view.
  changelogEntryIds?: string[];
  children: React.ReactNode;
  // Set on pages that render a feedback-post CommentSection — asks the
  // endpoint to also resolve which of `postIds`' comments/replies belong to
  // this visitor. Kept opt-in (rather than always-on) so pages without a
  // comment section (board list, roadmap) don't pay for a query they don't
  // need.
  includeCommentOwnership?: boolean;
  // Set on the one page that renders a comment moderation queue and needs
  // to know the bearer visitor's workspace role — requires `workspaceId`.
  includeModerator?: boolean;
  // Set on pages that render SubscribeToggle.
  includeSubscription?: boolean;
  isEmbed: boolean;
  postIds?: string[];
  workspaceId?: string;
}

export function EmbedPersonalizationProvider({
  changelogEntryId,
  changelogEntryIds,
  children,
  includeCommentOwnership,
  includeModerator,
  includeSubscription,
  isEmbed,
  postIds,
  workspaceId,
}: EmbedPersonalizationProviderProps) {
  const [value, setValue] =
    useState<PersonalizationContextValue>(DEFAULT_VALUE);

  // Fetch for this page's ID set whenever a token is available — not just
  // once at mount. A returning visitor already has a token when the page
  // loads, so the mount-time attempt covers that case; a visitor signing in
  // for the FIRST TIME on this exact page load has no token yet at mount,
  // so onEmbedTokenChange (the same same-window/cross-frame mechanism
  // useEmbedSignedIn already relies on) re-attempts once one appears —
  // otherwise `ready` would never become true for the rest of that page
  // load, silently withholding every correction (votes, ownership,
  // reactions, moderator, subscription) until the next reload. Discovered
  // verifying that a first-time sign-in immediately grants moderator
  // capabilities without a reload.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberately isEmbed-only — postIds/workspaceId/etc are this page's fixed identity, not values that change during this component's lifetime
  useEffect(() => {
    if (!isEmbed) {
      return;
    }

    let cancelled = false;

    function attemptFetch() {
      const token = getEmbedToken();
      if (!token) {
        return;
      }

      const params = new URLSearchParams();
      if (workspaceId) {
        params.set("workspaceId", workspaceId);
      }
      if (postIds?.length) {
        params.set("postIds", postIds.join(","));
      }
      if (includeCommentOwnership) {
        params.set("includeCommentOwnership", "1");
      }
      if (changelogEntryId) {
        params.set("changelogEntryId", changelogEntryId);
      }
      if (changelogEntryIds?.length) {
        params.set("changelogEntryIds", changelogEntryIds.join(","));
      }
      if (includeSubscription) {
        params.set("includeSubscription", "1");
      }
      if (includeModerator) {
        params.set("includeModerator", "1");
      }

      embedFetch(`/api/embed/personalization?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (cancelled || !json) {
            return;
          }
          const reactedEmojisById = new Map<string, Set<string>>(
            Object.entries(json.reactedEmojis ?? {}).map(([id, emojis]) => [
              id,
              new Set(emojis as string[]),
            ])
          );
          setValue({
            ready: true,
            data: {
              votedPostIds: new Set(json.votedPostIds ?? []),
              ownCommentIds: new Set(json.ownCommentIds ?? []),
              reactedEmojisById,
              subscribedChangelog: json.subscribedChangelog ?? null,
              isModerator: !!json.isModerator,
            },
          });
        })
        .catch(() => {
          // Leave the default in place — consumers fall back to their
          // server-rendered prop, same as if this provider weren't here.
        });
    }

    attemptFetch();
    const unsubscribe = onEmbedTokenChange(attemptFetch);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isEmbed]);

  return (
    <EmbedPersonalizationContext.Provider value={value}>
      {children}
    </EmbedPersonalizationContext.Provider>
  );
}

/** Resolved "have I voted on this post" — falls back to the server-rendered
 * default until (and unless) the embed personalization fetch resolves. */
export function useEmbedVoteState(
  postId: string,
  initialHasVoted: boolean
): boolean {
  const { ready, data } = useContext(EmbedPersonalizationContext);
  if (!ready) {
    return initialHasVoted;
  }
  return data.votedPostIds.has(postId);
}

/** Resolved "is this comment/reply mine" — falls back to the server-rendered
 * default (always false for a bearer-authenticated embed visitor) until (and
 * unless) the embed personalization fetch resolves. OR'd with `initialIsOwn`
 * rather than replaced by it: the fetch resolves once at mount, so a comment
 * created client-side afterward (its create response already correctly says
 * `isOwn: true`) isn't in `ownCommentIds` yet — trusting the fetch alone
 * would clobber that already-correct value back to false until the next
 * reload re-fetches. `initialIsOwn` is never a false positive (it's already
 * either the correct cookie-session comparison, or the create response's own
 * `isOwn: true`), so OR-ing in either direction is always safe. */
export function useEmbedCommentOwnership(
  commentId: string,
  initialIsOwn: boolean
): boolean {
  const { ready, data } = useContext(EmbedPersonalizationContext);
  if (!ready) {
    return initialIsOwn;
  }
  return initialIsOwn || data.ownCommentIds.has(commentId);
}

interface ReactionLike {
  emoji: string;
  hasReacted: boolean;
}

/** Resolved reaction groups for a comment or changelog entry — corrects
 * `hasReacted` (always false for a bearer-authenticated embed visitor's
 * server-rendered props) using the personalization fetch, once, at mount.
 * Applied via a one-time effect in the caller (mirrors useEmbedVoteState's
 * consumers) rather than recomputed every render, so a reaction the visitor
 * adds live afterward is managed purely by the caller's own local state from
 * then on — this hook never re-overrides it. Returns the SAME array
 * reference when nothing needs correcting, so an effect keyed on this value
 * only fires when a real correction exists. */
export function useEmbedReactionCorrections<T extends ReactionLike>(
  id: string,
  initialReactions: T[]
): T[] {
  const { ready, data } = useContext(EmbedPersonalizationContext);
  return useMemo(() => {
    if (!ready) {
      return initialReactions;
    }
    const reacted = data.reactedEmojisById.get(id);
    if (!reacted || reacted.size === 0) {
      return initialReactions;
    }
    let changed = false;
    const corrected = initialReactions.map((r) => {
      if (reacted.has(r.emoji) && !r.hasReacted) {
        changed = true;
        return { ...r, hasReacted: true };
      }
      return r;
    });
    return changed ? corrected : initialReactions;
  }, [ready, data, id, initialReactions]);
}

/** Resolved "am I subscribed to changelog emails" — falls back to the
 * server-rendered default until the embed personalization fetch resolves.
 * `null` from the endpoint (subscription wasn't requested on this page)
 * falls back to `initialSubscribed` too, same as `!ready`. */
export function useEmbedSubscriptionState(initialSubscribed: boolean): boolean {
  const { ready, data } = useContext(EmbedPersonalizationContext);
  if (!ready || data.subscribedChangelog === null) {
    return initialSubscribed;
  }
  return data.subscribedChangelog;
}

/** Resolved "can I moderate comments here" — falls back to the
 * server-rendered default (always false for a bearer-authenticated embed
 * visitor) until the fetch resolves. OR'd with `initialCanModerate` rather
 * than replaced by it, same reasoning as useEmbedCommentOwnership: never a
 * false positive, so OR-ing is always safe. */
export function useEmbedIsModerator(initialCanModerate: boolean): boolean {
  const { ready, data } = useContext(EmbedPersonalizationContext);
  if (!ready) {
    return initialCanModerate;
  }
  return initialCanModerate || data.isModerator;
}
