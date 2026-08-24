"use client";

import { PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Built as a Client Component so its <Link> child is always constructed
// locally, never received as a Server Component's `children` prop. Button's
// asChild path merges its classes/motion onto that child by inspecting
// `child.type`/`child.props` synchronously — but a child built on the server
// and passed down through the header's actions portal arrives as a streamed
// RSC reference for a render or two after a client-side navigation (e.g.
// switching the status filter), which isn't a plain element yet and made the
// button intermittently render unstyled (icon and text stacking instead of
// sitting inline). Constructing the Link client-side sidesteps that
// entirely — it's a normal, already-resolved element on every render. See
// add-feedback-button.tsx for the same fix applied to the Feedback page.
export function NewEntryButton({ slug }: { slug: string }) {
  return (
    <Button asChild>
      <Link href={`/${slug}/settings/changelog/new`}>
        <PlusIcon data-icon="inline-start" />
        New entry
      </Link>
    </Button>
  );
}
