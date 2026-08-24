import { ArrowDown, ArrowUp } from "lucide-react";

const STEPS = [
  {
    id: "01",
    name: "Collect",
    description:
      "Users submit feature requests and bug reports to your public boards.",
  },
  {
    id: "02",
    name: "Vote",
    description: "Votes surface what matters most — one per user, no gaming.",
  },
  {
    id: "03",
    name: "Plan",
    description: "Voted posts auto-populate your public roadmap by status.",
  },
  {
    id: "04",
    name: "Ship",
    description: "Admin changes post status to Completed when it's done.",
  },
  {
    id: "05",
    name: "Announce",
    description: "Write a changelog entry linked to the shipped feedback.",
  },
  {
    id: "06",
    name: "Notify",
    description: "Every voter automatically gets an email when you ship.",
  },
] as const;

function StepCard({
  id,
  name,
  description,
}: {
  id: string;
  name: string;
  description: string;
}) {
  return (
    <div className="flex flex-col p-5">
      <span className="font-mono text-2xs text-base-content/60">{id}</span>
      <span className="mt-3 font-semibold text-sm text-base-content">
        {name}
      </span>
      <p className="mt-1.5 text-xs leading-5 text-base-content/60">
        {description}
      </p>
    </div>
  );
}

export function LoopDiagram() {
  return (
    <section className="bg-base-200">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <p className="font-bold text-xs uppercase tracking-eyebrow text-success">
          The Full Picture
        </p>

        <h2 className="mt-4 max-w-2xl font-bold text-3xl text-base-content sm:text-4xl">
          Any tool can collect feedback. Only Shapio closes the loop.
        </h2>

        <div className="mt-12">
          {/* Desktop: horizontal 6-column grid with loop-back U-shape */}
          <div className="hidden lg:block">
            <div className="flex divide-x divide-base-300 border border-base-300">
              {STEPS.map((step) => (
                <StepCard key={step.id} {...step} />
              ))}
            </div>

            {/* U-shape loop-back */}
            <div className="h-6 border-b border-l border-r border-base-300" />
            <div className="flex items-center justify-between px-2 pt-2">
              <div className="flex items-center gap-1 text-base-content/60">
                <ArrowUp aria-hidden="true" className="size-3" />
                <span className="text-2xs font-medium">Collect</span>
              </div>
              <span className="text-2xs text-base-content/60">loop closes</span>
              <div className="flex items-center gap-1 text-base-content/60">
                <span className="text-2xs font-medium">Notify</span>
                <ArrowDown aria-hidden="true" className="size-3" />
              </div>
            </div>
          </div>

          {/* Mobile: 2×3 grid — gap-px with bg-base-300 creates 1px cell dividers */}
          <div className="grid grid-cols-2 gap-px border border-base-300 bg-base-300 lg:hidden">
            {STEPS.map((step) => (
              <div className="bg-base-200" key={step.id}>
                <StepCard {...step} />
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-base-content/60 lg:hidden">
            The loop closes — every voter is notified when you ship.
          </p>
        </div>

        <blockquote className="mt-16 max-w-2xl mx-auto text-center">
          <p className="font-semibold text-xl text-base-content">
            "Any single piece is a commodity. The integration is what makes it
            sticky."
          </p>
        </blockquote>
      </div>
    </section>
  );
}
