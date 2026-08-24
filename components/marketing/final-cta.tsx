import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="border-t border-ir-border bg-ir-muted-surface">
      <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-8">
        <h2 className="text-3xl font-black text-ir-heading sm:text-4xl">
          Ready to ship what your users actually want?
        </h2>

        <p className="mt-3 text-lg text-ir-muted">
          No credit card required. Voters never pay a seat fee.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signin">Start Free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#how-it-works">See How It Works →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
