import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

interface AuthShellProps {
  children: ReactNode;
  subtitle: string;
  title: string;
}

/**
 * Shared split-panel shell for the auth screens that aren't the main sign-in
 * form (signup, forgot/reset password) — same logo, card, and brand panel as
 * `AuthForm` (app/(auth)/_components/auth-form.tsx), factored out so new auth
 * pages don't re-diverge from that look.
 */
export function AuthShell({ children, subtitle, title }: AuthShellProps) {
  return (
    <main className="grid min-h-screen place-items-center overflow-y-auto bg-ir-primary-light/20 px-4 py-6 sm:py-8">
      <div className="grid w-full max-w-3xl overflow-hidden rounded-ir-xl border border-ir-border bg-ir-surface shadow-ir-lg lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <Link
            className="mb-6 flex justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 lg:justify-start"
            href="/"
          >
            <Logo className="h-9 w-auto" priority />
          </Link>

          <h1 className="text-xl font-bold text-ir-heading sm:text-2xl">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-ir-muted">{subtitle}</p>

          <div className="mt-6">{children}</div>
        </div>

        <div className="hidden flex-col items-center justify-center gap-5 overflow-hidden bg-ir-primary-light/15 px-8 py-8 lg:flex">
          <h2 className="max-w-sm text-center text-xl font-bold text-ir-heading">
            Ship what your users actually want.
          </h2>
          <Image
            alt="A feature roadmap with upvoted ideas, trending feedback, and a voting box — capturing how Shapio turns user feedback into a shared product roadmap"
            className="h-auto w-full"
            height={1123}
            src="/auth-illustration.png"
            width={1401}
          />
        </div>
      </div>
    </main>
  );
}
