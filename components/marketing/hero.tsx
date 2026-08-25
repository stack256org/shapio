import Link from "next/link";
import { HeroMockup } from "@/components/marketing/hero-mockup";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="bg-ir-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16">
          <div>
            <h1 className="text-5xl font-black tracking-normal text-ir-heading sm:text-6xl lg:text-7xl">
              Ship what your users actually want.
            </h1>

            <p className="mt-6 text-lg leading-8 text-ir-muted">
              Collect feedback, let users vote on priorities, publish a public
              roadmap, and automatically notify every voter the moment you ship.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signin">Start Free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#how-it-works">View Demo</Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-ir-muted">
              No credit card required. Self-hosted or managed.
            </p>
          </div>

          <div className="hidden lg:block">
            <HeroMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
