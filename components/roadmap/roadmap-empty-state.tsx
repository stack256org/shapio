"use client";

import { TrayIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";

export function RoadmapEmptyState({ label }: { label?: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="flex h-full min-h-24 flex-col items-center justify-center gap-3 px-4 py-12 text-center"
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex size-9 items-center justify-center rounded-ir-full bg-ir-muted-surface text-ir-muted">
        <TrayIcon className="size-4" />
      </div>
      <p className="text-sm text-ir-muted">{label ?? "Nothing here yet."}</p>
    </motion.div>
  );
}
