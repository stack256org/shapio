"use client";

import { BellIcon, BellSlashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateNotificationPreferencesAction } from "@/app/actions/notifications";
import { EmbedAuthDialog } from "@/components/embed/embed-auth-dialog";
import { useIsEmbed } from "@/components/embed/use-is-embed";
import { Button } from "@/components/ui/button";
import { embedFetch } from "@/lib/embed/fetch";
import { useEmbedSubscriptionState } from "@/lib/embed/personalization-context";
import { useEmbedSignedIn } from "@/lib/embed/use-embed-signed-in";

interface SubscribeToggleProps {
  initialSubscribed: boolean;
  isSignedIn: boolean;
}

// Unsubscribing here toggles the same global "Changelog updates" email
// preference shown in Notification Settings — it's the setting that actually
// gates whether changelog-published emails get sent, so this stays a single
// source of truth rather than a separate per-workspace follow mechanism.
export function SubscribeToggle({
  initialSubscribed,
  isSignedIn,
}: SubscribeToggleProps) {
  const router = useRouter();
  const isEmbed = useIsEmbed();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [signedIn, setSignedIn] = useEmbedSignedIn(isEmbed, isSignedIn);
  const [authOpen, setAuthOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Server-rendered `initialSubscribed` is computed from a cookie session,
  // always the opt-in default for a bearer-authenticated embed visitor —
  // correct it once at mount, the same way VoteButton/CommentReactions do
  // (see lib/embed/personalization-context.tsx). Guarded by a ref: the
  // personalization fetch is re-triggered by this SAME sign-in (the
  // provider re-fetches on every token change, not just at mount) and can
  // resolve AFTER updatePreference's own POST — a slower correction
  // response carrying pre-write data would otherwise clobber the
  // just-applied preference. Once the visitor has updated their preference
  // locally, that action is authoritative for the rest of this component's
  // lifetime.
  const hasLocalActionRef = useRef(false);
  const correctedSubscribed = useEmbedSubscriptionState(initialSubscribed);
  useEffect(() => {
    if (hasLocalActionRef.current) {
      return;
    }
    setSubscribed(correctedSubscribed);
  }, [correctedSubscribed]);

  // `next` is explicit rather than always `!subscribed`: the signed-out CTA
  // below always reads "Subscribe to Updates" regardless of the visitor's
  // actual last-known preference (unchanged pre-existing behavior), so
  // completing sign-in from it must always subscribe (true), not blindly
  // flip whatever `subscribed` happened to default to. Before Phase 6 this
  // call always failed with UNAUTHENTICATED in embed (no bearer support),
  // which silently masked this — now that it actually applies, the
  // direction has to be explicit.
  function updatePreference(next: boolean) {
    hasLocalActionRef.current = true;
    startTransition(async () => {
      // A Server Action can't carry a custom Authorization header from the
      // client — the embed path calls the bearer-authenticated Route
      // Handler instead; the direct/non-embed path is unchanged.
      const result = isEmbed
        ? await embedFetch("/api/embed/notification-preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailChangelog: next }),
          }).then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              return {
                success: false as const,
                error: data.error ?? "Something went wrong.",
                code:
                  res.status === 401 ? ("UNAUTHENTICATED" as const) : undefined,
              };
            }
            return { success: true as const, data: undefined };
          })
        : await updateNotificationPreferencesAction({
            emailChangelog: next,
          });
      if (!result.success) {
        // A session can go stale between page load and this click (expiry, a
        // sign-out elsewhere). Reopen the in-place prompt instead of leaving
        // the visitor stuck behind a generic error.
        if (result.code === "UNAUTHENTICATED" && isEmbed) {
          setSignedIn(false);
          setAuthOpen(true);
          return;
        }
        toast.error(result.error);
        return;
      }
      setSubscribed(next);
      toast.success(
        next ? "Subscribed to updates" : "Unsubscribed from updates"
      );
    });
  }

  if (!signedIn) {
    // Outside the embed, this stays hidden until signed in — unchanged from
    // the existing Public Portal behavior.
    if (!isEmbed) {
      return null;
    }
    return (
      <>
        <Button onClick={() => setAuthOpen(true)} size="sm" variant="outline">
          <BellIcon data-icon="inline-start" />
          Subscribe to Updates
        </Button>
        <EmbedAuthDialog
          onAuthenticated={() => {
            setSignedIn(true);
            router.refresh();
            updatePreference(true);
          }}
          onOpenChange={setAuthOpen}
          open={authOpen}
        />
      </>
    );
  }

  return (
    <Button
      disabled={isPending}
      onClick={() => updatePreference(!subscribed)}
      size="sm"
      variant="outline"
    >
      {subscribed ? (
        <>
          <BellSlashIcon data-icon="inline-start" />
          Unsubscribe from Updates
        </>
      ) : (
        <>
          <BellIcon data-icon="inline-start" />
          Subscribe to Updates
        </>
      )}
    </Button>
  );
}
