"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Built as a Client Component so its <Link> child is always constructed
// locally, never received as a Server Component's `children` prop — see
// add-feedback-button.tsx for the full explanation. CategorySidebar is a
// Server Component; passing <Link> directly into <Button asChild> there let
// the child arrive as an unresolved RSC reference for a render or two,
// which made the "+ Feedback" button intermittently lose its flex/gap
// styling and stack the icon above the text.
export function NewFeedbackButton({
  href,
  className = "w-full",
}: {
  href: string;
  className?: string;
}) {
  return (
    <Button asChild className={className}>
      <Link href={href}>
        <PlusIcon data-icon="inline-start" />
        Feedback
      </Link>
    </Button>
  );
}
