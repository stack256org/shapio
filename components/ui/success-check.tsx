"use client";

import { motion, useReducedMotion } from "framer-motion";

interface SuccessCheckProps {
  className?: string;
}

// Small reusable "success" moment: a circle + checkmark that draw themselves
// in once on mount. Used as the sonner success icon (so every toast.success()
// call in the app gets it for free) and available for other one-off success
// moments (e.g. a completed form action). Respects prefers-reduced-motion by
// skipping straight to the fully-drawn end state.
export function SuccessCheck({ className }: SuccessCheckProps) {
  const shouldReduceMotion = useReducedMotion();
  const drawn = shouldReduceMotion
    ? { pathLength: 1, opacity: 1 }
    : undefined;

  return (
    <motion.svg
      aria-hidden="true"
      className={className}
      fill="none"
      initial={false}
      viewBox="0 0 24 24"
    >
      <motion.circle
        animate={drawn ?? { pathLength: 1, opacity: 1 }}
        cx="12"
        cy="12"
        initial={drawn ?? { pathLength: 0, opacity: 0 }}
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      <motion.path
        animate={drawn ?? { pathLength: 1, opacity: 1 }}
        d="M7.5 12.5l3 3 6-6.5"
        initial={drawn ?? { pathLength: 0, opacity: 0 }}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.2 }}
      />
    </motion.svg>
  );
}
