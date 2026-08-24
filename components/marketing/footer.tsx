import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { DOCS_URL, GITHUB_REPO_URL } from "@/config/platform";

const LINKS = [
  {
    heading: "Product",
    items: [
      { label: "All Features", href: "/features" },
      { label: "Feedback Boards", href: "/features/feedback-boards" },
      { label: "Public Roadmap", href: "/features/roadmap" },
      { label: "Changelog", href: "/features/changelog" },
    ],
  },
  {
    heading: "Resources",
    items: [
      { label: "Demo", href: "/demo" },
      { label: "Documentation", href: DOCS_URL, external: true },
      { label: "GitHub", href: GITHUB_REPO_URL, external: true },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-ir-border bg-ir-surface">
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-8 sm:px-8">
        {/* Upper: logo + columns */}
        <div className="grid gap-10 sm:grid-cols-4">
          {/* Logo + tagline */}
          <div>
            <Link
              className="inline-flex rounded-ir-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
              href="/"
            >
              <Logo className="h-9 w-auto" />
            </Link>
            <p className="mt-3 text-sm text-ir-muted">
              Open-source customer feedback for growing teams.
            </p>
          </div>

          {/* Link columns */}
          {LINKS.map(({ heading, items }) => (
            <div key={heading}>
              <p className="text-sm font-medium text-ir-heading">{heading}</p>
              <ul className="mt-4 space-y-2">
                {items.map(({ label, href, ...rest }) => {
                  const isExternal = "external" in rest && rest.external;
                  return (
                    <li key={label}>
                      <Link
                        className="text-sm text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading"
                        href={href}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        target={isExternal ? "_blank" : undefined}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-ir-border pt-6">
          <p className="text-xs text-ir-muted">
            © 2026 Shapio. Open source for Product teams.
          </p>
        </div>
      </div>
    </footer>
  );
}
