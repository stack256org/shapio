"use client";

import { useRouter } from "next/navigation";
import { EmbedAuthPanel } from "./embed-auth-panel";

interface EmbedInlineSignInProps {
  title: string;
}

// Full-page (not modal) sign-in prompt for embed pages that have nothing to
// show until the visitor is authenticated — namely the new-post form, which
// otherwise used to redirect the whole widget out to /signin. Refreshing on
// success re-runs the page's own server-side session check, so the actual
// form takes over in place, no navigation involved.
export function EmbedInlineSignIn({ title }: EmbedInlineSignInProps) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="text-center text-lg font-semibold text-ir-heading">
        {title}
      </h1>
      <p className="mt-1.5 text-center text-sm text-ir-muted">
        Sign in to continue.
      </p>
      <div className="mt-6">
        <EmbedAuthPanel onAuthenticated={() => router.refresh()} />
      </div>
    </div>
  );
}
