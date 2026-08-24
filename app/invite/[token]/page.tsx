import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { getCurrentSession } from "@/lib/authz";
import { userExistsByEmail } from "@/lib/users/registration";
import { getInviteByToken } from "@/lib/workspaces/invites";
import { InviteAcceptButton } from "./_components/invite-accept-button";

interface Props {
  params: Promise<{ token: string }>;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return email;
  }
  return `${local.charAt(0)}${"*".repeat(Math.min(local.length - 1, 4))}@${domain}`;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <InviteLayout>
        <InviteStateCard
          body="This invitation link is invalid or no longer exists."
          heading="Invitation not found"
        />
      </InviteLayout>
    );
  }

  const now = new Date();

  if (invite.acceptedAt) {
    return (
      <InviteLayout>
        <InviteStateCard
          body={`This invitation to ${invite.workspace.name} has already been accepted.`}
          heading="Invitation already used"
          link={{ href: `/${invite.workspace.slug}`, label: "Go to workspace" }}
        />
      </InviteLayout>
    );
  }

  if (invite.revokedAt) {
    return (
      <InviteLayout>
        <InviteStateCard
          body="This invitation has been revoked by a Brand Admin."
          heading="Invitation revoked"
        />
      </InviteLayout>
    );
  }

  if (invite.expiresAt <= now) {
    return (
      <InviteLayout>
        <InviteStateCard
          body="This invitation has expired. Ask a Brand Admin to send a new one."
          heading="Invitation expired"
        />
      </InviteLayout>
    );
  }

  const session = await getCurrentSession();
  const inviterName =
    invite.inviter?.name || invite.inviter?.email || "Someone";

  if (!session) {
    // A brand-new invitee has no account/password yet — steer them straight
    // into the account-creating magic-link path on /signin instead of the
    // password sign-in form, which would just fail for them.
    const hasAccount = await userExistsByEmail(invite.email);
    const signinHref = `/signin?next=/invite/${token}&email=${encodeURIComponent(invite.email)}${hasAccount ? "" : "&signup=1"}`;

    return (
      <InviteLayout>
        <div className="space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-ir-muted">
            Workspace invitation
          </p>
          <h1 className="text-xl font-semibold text-ir-heading">
            Join {invite.workspace.name}
          </h1>
          <p className="text-sm text-ir-muted">
            {inviterName} invited you to join as a{" "}
            <span className="font-medium text-ir-heading">{invite.role}</span>.
          </p>
        </div>
        <div className="mt-6">
          <Link
            className="flex w-full items-center justify-center rounded-ir-button bg-ir-primary px-4 py-2.5 text-sm font-semibold text-ir-primary-foreground transition-colors duration-150 hover:bg-ir-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            href={signinHref}
          >
            {hasAccount ? "Sign in to accept" : "Create account to accept"}
          </Link>
          <p className="mt-3 text-center text-xs text-ir-muted">
            You'll need to {hasAccount ? "sign in" : "create your account"} with{" "}
            {maskEmail(invite.email)}.
          </p>
        </div>
      </InviteLayout>
    );
  }

  if (session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <InviteLayout>
        <InviteStateCard
          body={`This invitation was sent to ${maskEmail(invite.email)}. You're signed in as ${session.user.email}.`}
          heading="Wrong account"
          link={{ href: "/signin", label: "Sign in with a different account" }}
        />
      </InviteLayout>
    );
  }

  return (
    <InviteLayout>
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-ir-muted">
          Workspace invitation
        </p>
        <h1 className="text-xl font-semibold text-ir-heading">
          Join {invite.workspace.name}
        </h1>
        <p className="text-sm text-ir-muted">
          {inviterName} invited you as a{" "}
          <span className="font-medium text-ir-heading">{invite.role}</span>.
        </p>
      </div>
      <div className="mt-6">
        <InviteAcceptButton token={token} />
      </div>
    </InviteLayout>
  );
}

function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-ir-primary-light/20 px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          className="mb-8 flex justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
          href="/"
        >
          <Logo className="h-16 w-auto" priority />
        </Link>
        <div className="rounded-ir-xl border border-ir-border bg-ir-surface px-4 py-8 shadow-ir-lg sm:px-8">
          {children}
        </div>
      </div>
    </main>
  );
}

function InviteStateCard({
  heading,
  body,
  link,
}: {
  heading: string;
  body: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-lg font-semibold text-ir-heading">{heading}</h1>
      <p className="text-sm text-ir-muted">{body}</p>
      {link && (
        <Link
          className="inline-block text-sm font-medium text-ir-heading underline underline-offset-4 hover:text-ir-muted transition-colors duration-150"
          href={link.href}
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}
