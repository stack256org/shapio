const PROBLEMS = [
  {
    before: "Feature requests buried in email, Notion, and Slack",
    after:
      "One board. Every request in one place, ranked by the users who care most.",
  },
  {
    before: "Roadmap decisions based on whoever complained loudest",
    after:
      "Vote counts give you real signal. Build what's actually blocking users.",
  },
  {
    before: "Shipping features users asked for — without them ever finding out",
    after: "Every voter gets an email the day their requested feature ships.",
  },
] as const;

export function ProblemFraming() {
  return (
    <section className="bg-ir-muted-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <p className="text-xs font-bold tracking-eyebrow text-ir-success uppercase">
          Sound Familiar?
        </p>

        <h2 className="mt-4 text-3xl font-bold text-ir-heading sm:text-4xl">
          Feedback is everywhere.
          <br className="hidden sm:block" />
          Structure is nowhere.
        </h2>

        <p className="mt-3 max-w-2xl text-lg text-ir-muted">
          Most product teams collect feedback in five different places, make
          roadmap decisions by instinct, and ship features into silence. Shapio
          fixes all three.
        </p>

        <div className="mt-12 grid gap-px overflow-hidden rounded-ir-lg bg-ir-border sm:grid-cols-3">
          {PROBLEMS.map(({ before, after }) => (
            <div className="bg-ir-surface p-6" key={before}>
              <p className="text-sm text-ir-muted">{before}</p>
              <div className="mt-4 flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-0.5 font-mono text-ir-success"
                >
                  ✓
                </span>
                <p className="text-sm font-semibold text-ir-heading">{after}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
