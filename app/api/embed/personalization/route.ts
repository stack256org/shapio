import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getOwnChangelogCommentIds } from "@/lib/changelog-comments/queries";
import {
  getOwnReactedEmojisForChangelogEntry,
  getOwnReactedEntryEmojis,
  getOwnReactedEntryEmojisBatch,
} from "@/lib/changelog-comments/reactions";
import { getOwnCommentIds } from "@/lib/comments/queries";
import { getOwnReactedEmojisForPosts } from "@/lib/comments/reactions";
import { getNotificationPreferences } from "@/lib/notifications/queries";
import { getPortalActor } from "@/lib/portal/guest-identity";
import { getVotedPostIds } from "@/lib/voting/list";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

// Bearer-authenticated "what's true about me on this page" endpoint for the
// embed widget — see the implementation plan's "embed personalization layer"
// section. Server Components compute isOwn/hasVoted/hasReacted/etc. from
// getCurrentSession() (cookie-based), which is always null for an embed
// visitor authenticated only via a bearer token stored in sessionStorage —
// invisible to the server at render time. This route recomputes the same
// booleans using the SAME existing query functions, just resolving identity
// from the bearer token instead. Only sanitized booleans are ever returned —
// never raw identity — matching the existing privacy design in
// app/api/posts/[postId]/comments/route.ts ("never return author_email").
//
// Extensible by design: each field is computed only when its corresponding
// query param is present, so later phases (comment ownership/reactions,
// changelog reactions/subscription, moderator role) add a param + a field
// without touching what's already here.
export async function GET(req: NextRequest) {
  // Usually an accountless visitor who verified their email (actor.id null),
  // identified by the signed X-Portal-Guest token; a real session still wins.
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Everything below except votes is account-only by construction: guests
  // cannot own comments (theirs are final), cannot react, hold no notification
  // preferences, and are never workspace members. Those blocks are skipped for
  // them and return their empty defaults rather than being faked.
  const userId = actor.id;

  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  const postIdsParam = req.nextUrl.searchParams.get("postIds");
  const includeCommentOwnership =
    req.nextUrl.searchParams.get("includeCommentOwnership") === "1";
  const changelogEntryId = req.nextUrl.searchParams.get("changelogEntryId");
  // Plural, distinct from the singular changelogEntryId above: the changelog
  // list page renders one ChangelogReactions per entry (no comment section
  // at all there), so it needs entry-level reaction correction for many
  // entries at once rather than the single-entry detail page's scope.
  const changelogEntryIdsParam =
    req.nextUrl.searchParams.get("changelogEntryIds");
  const includeSubscription =
    req.nextUrl.searchParams.get("includeSubscription") === "1";
  const includeModerator =
    req.nextUrl.searchParams.get("includeModerator") === "1";

  let votedPostIds: string[] = [];
  if (workspaceId && postIdsParam) {
    const requested = new Set(postIdsParam.split(",").filter(Boolean));
    // The one field that works for both: votes are attributed by user id for
    // an account and by verified email for a guest.
    const allVoted = await getVotedPostIds(workspaceId, {
      userId: userId ?? undefined,
      userEmail: userId ? undefined : actor.email,
    });
    votedPostIds = allVoted.filter((id) => requested.has(id));
  }

  const ownCommentIds = new Set<string>();
  // Keyed by comment id OR changelogEntryId — both are globally unique, so a
  // single map covers "reacted to this comment" and "reacted to this entry"
  // without needing two separate response fields.
  const reactedEmojisById = new Map<string, string[]>();

  if (userId && includeCommentOwnership && postIdsParam) {
    const postIds = postIdsParam.split(",").filter(Boolean);
    const [ownIds, reactedEmojis] = await Promise.all([
      getOwnCommentIds(postIds, userId),
      getOwnReactedEmojisForPosts(postIds, userId),
    ]);
    for (const id of ownIds) {
      ownCommentIds.add(id);
    }
    for (const [id, emojis] of reactedEmojis) {
      reactedEmojisById.set(id, emojis);
    }
  }
  if (userId && changelogEntryId) {
    const [ownIds, commentReactedEmojis, entryReactedEmojis] =
      await Promise.all([
        getOwnChangelogCommentIds(changelogEntryId, userId),
        getOwnReactedEmojisForChangelogEntry(changelogEntryId, userId),
        getOwnReactedEntryEmojis(changelogEntryId, userId),
      ]);
    for (const id of ownIds) {
      ownCommentIds.add(id);
    }
    for (const [id, emojis] of commentReactedEmojis) {
      reactedEmojisById.set(id, emojis);
    }
    if (entryReactedEmojis.length > 0) {
      reactedEmojisById.set(changelogEntryId, entryReactedEmojis);
    }
  }
  if (userId && changelogEntryIdsParam) {
    const changelogEntryIds = changelogEntryIdsParam.split(",").filter(Boolean);
    const batch = await getOwnReactedEntryEmojisBatch(
      changelogEntryIds,
      userId
    );
    for (const [id, emojis] of batch) {
      reactedEmojisById.set(id, emojis);
    }
  }

  let subscribedChangelog: boolean | null = null;
  if (userId && includeSubscription) {
    const prefs = await getNotificationPreferences(userId);
    // Opt-out model, same default used server-side in changelog/page.tsx.
    subscribedChangelog = prefs?.emailChangelog ?? true;
  }

  let isModerator = false;
  if (userId && includeModerator && workspaceId) {
    const member = await getWorkspaceMember(workspaceId, userId);
    isModerator = !!member && member.role !== WORKSPACE_MEMBER;
  }

  return NextResponse.json({
    votedPostIds,
    ownCommentIds: [...ownCommentIds],
    reactedEmojis: Object.fromEntries(reactedEmojisById),
    subscribedChangelog,
    isModerator,
  });
}
