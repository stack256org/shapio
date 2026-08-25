"use client";

import { TrayIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";

export function PostsEmptyState() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center"
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex size-10 items-center justify-center rounded-ir-full bg-ir-muted-surface text-ir-muted">
        <TrayIcon className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-ir-heading">No feedback yet</p>
        <p className="mt-1 text-xs text-ir-muted">
          Submitted feedback will show up here.
        </p>
      </div>
    </motion.div>
  );
}
