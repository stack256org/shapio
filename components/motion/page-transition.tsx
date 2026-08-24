"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// Subtle entrance-only page transition — no AnimatePresence/exit animation,
// since Next.js `template.tsx` already unmounts the previous page and mounts
// this one fresh on every navigation. Keeping it enter-only avoids double-
// rendering the old and new page at once, which is both simpler and cheaper.
export function PageTransition({ children }: { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
