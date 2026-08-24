import Link from "next/link";
import { GuestIdentityBadge } from "@/components/portal/guest-identity-badge";
import { PortalSignInButton } from "@/components/portal/portal-sign-in-button";
import { Button } from "@/components/ui/button";
import { SquareAvatar } from "@/components/ui/square-avatar";
import { PortalMobileNav } from "@/components/workspace/portal-mobile-nav";
import { isFeatureEnabled } from "@/lib/orbit/feature-flags";

interface Board {
  id: string;
  name: string;
  slug: string;
}

interface PortalHeaderProps {
  active?: "roadmap" | "changelog";
  boards: Board[];
  changelogPublic: boolean;
  currentPath?: string;
  // Identity an accountless visitor has verified, when there is no account.
  // Shown in place of the sign-in button so they can see who they are posting
  // as and correct it — the name when they gave one, the address otherwise.
  guestEmail?: string | null;
  guestName?: string | null;
  isMember?: boolean;
  isSignedIn: boolean;
  logoUrl?: string | null;
  roadmapPublic: boolean;
  rssHref?: string;
  slug: string;
  userEmail?: string | null;
  userImage?: string | null;
  userName?: string | null;
  workspaceName: string;
}

/**
 * Public-facing header for a brand's feedback portal (board, post, roadmap,
 * changelog, profile pages). Reading is open to anyone; signed-in people get
 * a profile avatar (linking to their profile page), members additionally get
 * a link back to their admin dashboard; visitors get a sign-in link.
 * Participation (vote/comment/submit) is gated elsewhere.
 */
export async function PortalHeader({
  slug,
  workspaceName,
  logoUrl,
  boards,
  roadmapPublic,
  changelogPublic,
  isSignedIn,
  guestEmail,
  guestName,
  isMember = false,
  userImage,
  userName,
  userEmail,
  active,
  rssHref: _rssHref,
  currentPath,
}: PortalHeaderProps) {
  const profileFallback = (userName || userEmail || "?")
    .charAt(0)
    .toUpperCase();
  const navLinkClass =
    "rounded-ir-sm px-3 py-1.5 text-sm font-medium text-ir-muted transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface hover:text-ir-heading";
  const activeLinkClass =
    "rounded-ir-sm px-3 py-1.5 text-sm font-medium text-ir-primary bg-ir-primary-light/15";

  const homeHref = boards[0] ? `/${slug}/b/${boards[0].slug}` : `/${slug}`;
  // Always carry a same-host `next` — falling back to bare /signin would send
  // a Portal-host visitor through /post-auth's admin-only default, which
  // 404s/bounces to the Workspace host since the Portal session cookie it
  // just received doesn't carry over there.
  const signInHref = `/signin?next=${encodeURIComponent(currentPath || homeHref)}`;
  // With accountless participation off, email verification buys a visitor
  // nothing, so the button goes back to being a plain link to /signin — the
  // same master switch getPortalActor reads.
  const guestVerification = await isFeatureEnabled("guest_voting");

  return (
    <header className="sticky top-0 z-20 border-b border-ir-border bg-ir-surface/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3">
          <PortalMobileNav
            active={active}
            changelogPublic={changelogPublic}
            isMember={isMember}
            roadmapPublic={roadmapPublic}
            slug={slug}
          />
          <Link
            className="flex items-center gap-2 text-sm font-semibold text-ir-heading transition-colors duration-150 ease-ir-standard hover:text-ir-primary"
            href={homeHref}
          >
            <SquareAvatar
              alt={workspaceName}
              className="size-7 rounded-ir-sm"
              fallback={workspaceName.charAt(0).toUpperCase()}
              imageUrl={logoUrl}
            />
            {workspaceName}
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {(roadmapPublic || isMember) && (
              <Link
                className={
                  active === "roadmap" ? activeLinkClass : navLinkClass
                }
                href={`/${slug}/roadmap`}
              >
                Roadmap
              </Link>
            )}
            {(changelogPublic || isMember) && (
              <Link
                className={
                  active === "changelog" ? activeLinkClass : navLinkClass
                }
                href={`/${slug}/changelog`}
              >
                Changelog
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <>
              {isMember && (
                <Link
                  className="rounded-ir-sm px-3.5 py-2 text-sm font-medium text-ir-muted transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface hover:text-ir-heading"
                  href={`/${slug}`}
                >
                  Dashboard
                </Link>
              )}
              <Link aria-label="My profile" href={`/${slug}/profile`}>
                <SquareAvatar
                  alt={userName ?? "My profile"}
                  className="size-9 rounded-ir-full ring-1 ring-ir-border transition-shadow duration-150 ease-ir-standard hover:ring-ir-primary/40"
                  fallback={profileFallback}
                  imageUrl={userImage}
                />
              </Link>
            </>
          ) : guestEmail ? (
            <GuestIdentityBadge email={guestEmail} name={guestName} />
          ) : guestVerification ? (
            /* Verifies an email in place instead of routing to the app's
               login screen — accounts here are invitation-only, so a customer
               sent to /signin has nothing to sign in with. */
            <PortalSignInButton signInHref={signInHref} />
          ) : (
            <Button asChild size="sm">
              <Link href={signInHref}>Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
