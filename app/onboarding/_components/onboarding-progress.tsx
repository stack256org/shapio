"use client";

import { motion, useReducedMotion } from "framer-motion";

interface OnboardingProgressProps {
  step: number;
  totalSteps: number;
}

export function OnboardingProgress({
  step,
  totalSteps,
}: OnboardingProgressProps) {
  const shouldReduceMotion = useReducedMotion();
  const percent = (step / totalSteps) * 100;

  return (
    <div className="w-full">
      <p className="mb-2 text-xs font-medium text-ir-muted">
        Step {step} of {totalSteps}
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-ir-full bg-ir-muted-surface">
        <motion.div
          animate={{ width: `${percent}%` }}
          className="h-full rounded-ir-full bg-ir-primary"
          initial={false}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.3, ease: "easeOut" }
          }
        />
      </div>
    </div>
  );
}
