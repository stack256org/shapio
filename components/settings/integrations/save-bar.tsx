"use client";

import { CheckIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface SaveBarProps {
  discardLabel?: string;
  isDirty: boolean;
  isSaving: boolean;
  isTesting?: boolean;
  justSaved: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onTest?: () => void;
  saveLabel?: string;
  testDisabled?: boolean;
  testLabel?: string;
}

// The Test/Discard/Save row shared by every integration form. Save + Discard
// only appear once something has actually changed; a "Saved" checkmark
// briefly replaces them right after a successful save instead of the row
// just silently vanishing.
export function SaveBar({
  isDirty,
  isSaving,
  justSaved,
  onSave,
  onDiscard,
  onTest,
  isTesting,
  testDisabled,
  testLabel = "Test connection",
  saveLabel = "Save",
  discardLabel = "Discard",
}: SaveBarProps) {
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.15, ease: "easeOut" as const };

  return (
    <div className="mt-5 flex flex-wrap items-center justify-end gap-y-2 gap-x-2 border-t border-ir-border pt-4">
      {onTest && (
        <Button
          disabled={isTesting || testDisabled}
          onClick={onTest}
          type="button"
          variant="outline"
        >
          {isTesting ? "Testing…" : testLabel}
        </Button>
      )}

      <div className="flex min-h-9 items-center">
        <AnimatePresence mode="wait">
          {isDirty ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
              exit={{ opacity: 0, y: -4 }}
              initial={{ opacity: 0, y: -4 }}
              key="actions"
              transition={transition}
            >
              <Button
                disabled={isSaving}
                onClick={onDiscard}
                type="button"
                variant="ghost"
              >
                {discardLabel}
              </Button>
              <Button disabled={isSaving} onClick={onSave} type="button">
                {isSaving ? "Saving…" : saveLabel}
              </Button>
            </motion.div>
          ) : justSaved ? (
            <motion.span
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 px-1 text-sm font-medium text-ir-success"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0, y: -4 }}
              key="saved"
              transition={transition}
            >
              <CheckIcon className="size-4" weight="bold" />
              Saved
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
