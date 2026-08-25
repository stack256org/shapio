export function SkipLink() {
  return (
    <a
      className="sr-only rounded-ir-sm bg-ir-primary px-4 py-2 text-sm font-medium text-ir-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
      href="#main-content"
    >
      Skip to content
    </a>
  );
}
