"use client";

import { BellIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";

export function NotificationEmptyState() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center px-6 py-20 text-center"
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-ir-full bg-ir-muted-surface">
        <BellIcon className="size-6 text-ir-muted" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-ir-heading">
        No notifications yet
      </h3>
      <p className="max-w-xs text-sm leading-relaxed text-ir-muted">
        When posts you've voted on get updates, or when someone comments on your
        posts, you'll see them here.
      </p>
    </motion.div>
  );
}
