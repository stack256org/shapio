import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { getCurrentSession } from "@/lib/authz";
import { getInviteLinkByToken } from "@/lib/workspaces/invite-links";
import { JoinButton } from "./_components/join-button";

interface Props {
  params: Promise<{ linkToken: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { linkToken } = await params;
  const link = await getInviteLinkByToken(linkToken);

  if (!link) {
    notFound();
  }

  const now = new Date();

  if (!link.isActive) {
    return (
      <JoinLayout>
        <JoinStateCard
          body="This invite link has been deactivated by a Brand Admin."
          heading="Link deactivated"
        />
      </JoinLayout>
    );
  }

  if (link.expiresAt && link.expiresAt <= now) {
    return (
      <JoinLayout>
        <JoinStateCard
          body="This invite link has expired. Ask a Brand Admin for a new one."
          heading="Link expired"
        />
      </JoinLayout>
    );
  }

  if (link.maxUses !== null && link.useCount >= link.maxUses) {
    return (
      <JoinLayout>
        <JoinStateCard
          body="This invite link has reached its maximum number of uses."
          heading="Link unavailable"
        />
      </JoinLayout>
    );
  }

  if (link.workspace.isSuspended) {
    return (
      <JoinLayout>
        <JoinStateCard
          body="This workspace is currently suspended."
          heading="Workspace unavailable"
        />
      </JoinLayout>
    );
  }

  const session = await getCurrentSession();

  return (
    <JoinLayout>
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-ir-muted">
          Workspace invitation
        </p>
        <h1 className="text-xl font-semibold text-ir-heading">
          Join {link.workspace.name}
        </h1>
        <p className="text-sm text-ir-muted">
          You've been invited as a{" "}
          <span className="font-medium text-ir-heading">{link.role}</span>.
        </p>
      </div>
      <div className="mt-6">
        {session ? (
          <JoinButton token={linkToken} />
        ) : (
          <Link
            className="flex w-full items-center justify-center rounded-ir-button bg-ir-primary px-4 py-2.5 text-sm font-semibold text-ir-primary-foreground transition-colors duration-150 hover:bg-ir-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            href={`/signin?next=${encodeURIComponent(`/invite/link/${linkToken}`)}`}
          >
            Sign in to join
          </Link>
        )}
      </div>
    </JoinLayout>
  );
}

function JoinLayout({ children }: { children: React.ReactNode }) {
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

function JoinStateCard({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-lg font-semibold text-ir-heading">{heading}</h1>
      <p className="text-sm text-ir-muted">{body}</p>
    </div>
  );
}
