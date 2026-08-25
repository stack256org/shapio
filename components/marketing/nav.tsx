import Link from "next/link";
import { NavFeaturesDropdown } from "@/components/marketing/nav-features-dropdown";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-ir-border bg-ir-surface/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
        <Link
          className="flex items-center rounded-ir-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
          href="/"
        >
          <Logo className="h-10 w-auto" priority />
        </Link>

        <nav
          aria-label="Site navigation"
          className="hidden items-center gap-1 md:flex"
        >
          <NavFeaturesDropdown />

          <Link
            className="rounded-ir-sm px-3 py-2 text-xs font-semibold tracking-ui text-ir-muted uppercase transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface hover:text-ir-heading"
            href="/demo"
          >
            Demo
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            className="hidden sm:inline-flex"
            size="sm"
            variant="ghost"
          >
            <Link href="/signin">Sign In</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signin">Start Free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
