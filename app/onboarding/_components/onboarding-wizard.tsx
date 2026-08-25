"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  completeOnboardingAction,
  type OnboardingUsage,
} from "@/app/actions/onboarding";
import { OnboardingProgress } from "@/app/onboarding/_components/onboarding-progress";
import { StepUsage } from "@/app/onboarding/_components/steps/step-usage";
import { StepWelcome } from "@/app/onboarding/_components/steps/step-welcome";
import { StepWorkspace } from "@/app/onboarding/_components/steps/step-workspace";

const TOTAL_STEPS = 3;

interface OnboardingWizardProps {
  appHost: string;
  initialName: string;
}

export function OnboardingWizard({
  appHost,
  initialName,
}: OnboardingWizardProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [name, setName] = useState(initialName);
  const [workspaceName, setWorkspaceName] = useState("");
  const [usage, setUsage] = useState<OnboardingUsage>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function goTo(next: number) {
    setDirection(next > step ? 1 : -1);
    setError(null);
    setStep(next);
  }

  async function finish(input: {
    description?: string;
    slug?: string;
    usageOverride?: OnboardingUsage;
  }) {
    setSubmitting(true);
    setError(null);

    const result = await completeOnboardingAction({
      name,
      workspaceName: workspaceName || name,
      slug: input.slug,
      description: input.description,
      usage: input.usageOverride ?? usage,
    });

    if (!result.success) {
      setSubmitting(false);
      setError(result.error);
      // A slug collision (rare — only possible if someone else claimed it
      // between the live check and submit) surfaces on Step 3, where the
      // field actually lives.
      setStep(3);
      return;
    }

    router.push(
      result.data.usage === "widget"
        ? `/${result.data.slug}/settings/embed`
        : `/${result.data.slug}`
    );
  }

  function handleSkip() {
    finish({ usageOverride: null });
  }

  const stepContent = (() => {
    switch (step) {
      case 1:
        return (
          <StepWelcome
            error={error}
            name={name}
            onContinue={() => {
              if (!name.trim() || !workspaceName.trim()) {
                setError("Please fill in both fields to continue.");
                return;
              }
              goTo(2);
            }}
            onNameChange={setName}
            onWorkspaceNameChange={setWorkspaceName}
            workspaceName={workspaceName}
          />
        );
      case 2:
        return (
          <StepUsage
            onBack={() => goTo(1)}
            onChoose={(choice) => {
              setUsage(choice);
              goTo(3);
            }}
          />
        );
      case 3:
        return (
          <StepWorkspace
            appHost={appHost}
            error={error}
            onBack={() => goTo(2)}
            onSubmit={({ slug, description }) => finish({ slug, description })}
            submitting={submitting}
            workspaceName={workspaceName}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <main className="min-h-screen bg-ir-primary-light/20 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div className="w-full max-w-xs">
            <OnboardingProgress step={step} totalSteps={TOTAL_STEPS} />
          </div>
          <Link
            className="shrink-0 text-sm font-medium text-ir-muted underline-offset-2 hover:text-ir-heading hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (!submitting) {
                handleSkip();
              }
            }}
          >
            Skip for now
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-ir-xl border border-ir-border bg-ir-surface p-6 shadow-ir-lg sm:p-10">
          <AnimatePresence custom={direction} initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              custom={direction}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: direction * -24 }
              }
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: direction * 24 }
              }
              key={step}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {stepContent}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
