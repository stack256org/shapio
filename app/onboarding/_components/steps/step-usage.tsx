"use client";

import { BrowserIcon, PuzzlePieceIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { OnboardingUsage } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";

interface StepUsageProps {
  onBack: () => void;
  onChoose: (usage: OnboardingUsage) => void;
}

interface UsageOption {
  cta: string;
  description: string;
  icon: ReactNode;
  title: string;
  usage: OnboardingUsage;
}

const OPTIONS: UsageOption[] = [
  {
    usage: "widget",
    icon: <PuzzlePieceIcon className="size-5" weight="duotone" />,
    title: "Feedback Widget",
    description:
      "Collect feedback right inside your product with an embeddable widget — your users never leave the page.",
    cta: "Start with Widget",
  },
  {
    usage: "portal",
    icon: <BrowserIcon className="size-5" weight="duotone" />,
    title: "Public Portal",
    description:
      "Create a standalone feedback hub on its own page, where users can submit ideas, vote, and follow your roadmap.",
    cta: "Start with Portal",
  },
];

export function StepUsage({ onChoose, onBack }: StepUsageProps) {
  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <h1 className="text-2xl font-bold text-ir-heading">
        How would you like to use Shapio?
      </h1>
      <p className="mt-1.5 text-sm text-ir-muted">
        You can always turn on the other option later — this just tailors where
        we send you next.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <button
            className="group flex flex-col items-start gap-3 rounded-ir-card border border-ir-border bg-ir-surface p-5 text-left shadow-ir-xs transition-all duration-150 ease-ir-standard hover:border-ir-primary/40 hover:shadow-ir-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            key={option.usage}
            onClick={() => onChoose(option.usage)}
            type="button"
          >
            <span className="flex size-10 items-center justify-center rounded-ir-md bg-ir-primary-light/20 text-ir-primary">
              {option.icon}
            </span>
            <span className="text-base font-semibold text-ir-heading">
              {option.title}
            </span>
            <span className="text-sm leading-relaxed text-ir-muted">
              {option.description}
            </span>
            <span className="mt-auto flex w-full items-center justify-center rounded-ir-button bg-ir-primary px-4 py-2 text-sm font-medium text-ir-primary-foreground transition-colors duration-150 ease-ir-standard group-hover:bg-ir-primary-hover">
              {option.cta}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <Button onClick={onBack} type="button" variant="ghost">
          Back
        </Button>
        <Button onClick={() => onChoose(null)} type="button" variant="outline">
          Not sure yet — decide later
        </Button>
      </div>
    </div>
  );
}
