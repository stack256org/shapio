"use client";

import { UserIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useIsEmbed } from "@/components/embed/use-is-embed";
import { useEmbedSignedIn } from "@/lib/embed/use-embed-signed-in";

interface Board {
  slug: string;
}

interface EmbedNavProps {
  active?: "feedback" | "roadmap" | "changelog" | "profile";
  boards: Board[];
  changelogPublic: boolean;
  embedQuery: string;
  // The board THIS embed instance is configured for (widget.js's data-board),
  // not just any public board — falls back to boards[0] only when the caller
  // genuinely has no specific board in view (e.g. the profile/changelog/
  // roadmap pages, which aren't scoped to one board).
  feedbackBoardSlug?: string;
  isSignedIn: boolean;
  roadmapPublic: boolean;
  slug: string;
}

/**
 * Cross-section tab bar shown in place of PortalHeader while embedded — the
 * widget hides all normal nav chrome, so without this a visitor has no way
 * to move between Feedback/Roadmap/Changelog/Profile once inside it.
 */
export function EmbedNav({
  active,
  boards,
  changelogPublic,
  embedQuery,
  feedbackBoardSlug,
  isSignedIn,
  roadmapPublic,
  slug,
}: EmbedNavProps) {
  // The profile icon's visibility used to trust the server-rendered
  // isSignedIn prop directly — always false for a bearer-authenticated
  // embed visitor (cookie session never persists there), so the icon
  // silently vanished on every reload even for an actually-signed-in
  // returning visitor. This is the exact "am I signed in" question
  // useEmbedSignedIn already answers correctly (silent restore + live
  // cross-widget sync) — no new plumbing needed, just adopting it here too.
  const isEmbed = useIsEmbed();
  const [signedIn] = useEmbedSignedIn(isEmbed, isSignedIn);

  const navLinkClass =
    "rounded-ir-sm px-2.5 py-1.5 text-sm font-medium text-ir-muted transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface hover:text-ir-heading";
  const activeLinkClass =
    "rounded-ir-sm px-2.5 py-1.5 text-sm font-medium text-ir-primary bg-ir-primary-light/15";
  const feedbackSlug = feedbackBoardSlug ?? boards[0]?.slug;

  return (
    <header className="border-b border-ir-border bg-ir-surface">
      <nav className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1">
          {feedbackSlug && (
            <Link
              className={active === "feedback" ? activeLinkClass : navLinkClass}
              href={`/${slug}/b/${feedbackSlug}${embedQuery}`}
            >
              Feedback
            </Link>
          )}
          {roadmapPublic && (
            <Link
              className={active === "roadmap" ? activeLinkClass : navLinkClass}
              href={`/${slug}/roadmap${embedQuery}`}
            >
              Roadmap
            </Link>
          )}
          {changelogPublic && (
            <Link
              className={
                active === "changelog" ? activeLinkClass : navLinkClass
              }
              href={`/${slug}/changelog${embedQuery}`}
            >
              Changelog
            </Link>
          )}
        </div>
        {signedIn && (
          <Link
            aria-label="My profile"
            className={`shrink-0 ${active === "profile" ? "text-ir-primary" : "text-ir-muted hover:text-ir-heading"} rounded-ir-full p-1.5 transition-colors duration-150 ease-ir-standard`}
            href={`/${slug}/profile${embedQuery}`}
          >
            <UserIcon
              className="size-4"
              weight={active === "profile" ? "fill" : "regular"}
            />
          </Link>
        )}
      </nav>
    </header>
  );
}
