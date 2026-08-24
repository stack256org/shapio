import Link from "next/link";
import { CopyButton } from "@/components/marketing/copy-button";
import { Button } from "@/components/ui/button";
import { DOCS_URL, GITHUB_REPO_URL } from "@/config/platform";

const INCLUDED_ITEMS = [
  "Feedback boards, public or private",
  "Public roadmap, auto-generated",
  "Changelog with voter notifications",
  "Email notifications, one-click unsubscribe",
  "Team management with roles and invites",
] as const;

function CodeBlock({ command }: { command: string }) {
  return (
    <div className="mt-3 flex items-start justify-between border border-primary-content/15 bg-primary-content/5 px-4 py-3">
      <pre className="overflow-x-auto text-xs font-mono leading-6 text-primary-content/80">
        <code>{command}</code>
      </pre>
      <CopyButton className="ml-4" text={command} />
    </div>
  );
}

export function QuickStart() {
  return (
    <section className="bg-primary text-primary-content">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8">
        <p className="font-bold text-xs uppercase tracking-eyebrow text-success-light">
          Quick Start
        </p>

        <h2 className="mt-4 font-black text-3xl text-primary-content sm:text-4xl">
          Running in under 30 minutes.
        </h2>

        <p className="mt-3 text-lg text-primary-content/70">
          No cloud account. No credit card. No vendor relationship.
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_auto]">
          {/* Steps */}
          <div className="space-y-8">
            <div>
              <p className="text-sm font-semibold text-primary-content/80">
                1. Clone the repo
              </p>
              <CodeBlock command={`git clone ${GITHUB_REPO_URL}`} />
            </div>

            <div>
              <p className="text-sm font-semibold text-primary-content/80">
                2. Add your configuration
              </p>
              <CodeBlock
                command={
                  "cp .env.example .env\n# Set your database URL, auth secret, and SMTP host"
                }
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-primary-content/80">
                3. Start collecting feedback
              </p>
              <CodeBlock
                command={
                  "docker compose up -d\n# App runs at http://localhost:3000"
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button asChild size="lg" variant="secondary">
                <Link href="/signin">Get Started Free</Link>
              </Button>
              <Link
                className="text-sm text-primary-content/60 transition-colors duration-150 hover:text-primary-content"
                href={DOCS_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                Full self-hosting guide →
              </Link>
            </div>
          </div>

          {/* What's included panel */}
          <div className="hidden border border-primary-content/15 bg-primary-content/5 p-6 lg:block lg:w-64">
            <p className="text-xs font-semibold uppercase tracking-ui text-primary-content/60">
              What's Included
            </p>
            <ul className="mt-4 space-y-3">
              {INCLUDED_ITEMS.map((item) => (
                <li
                  className="flex items-start gap-2 text-sm text-primary-content/70"
                  key={item}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 font-mono text-success-light"
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
