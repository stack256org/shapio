import { useEffect, useId } from "react";
import { useUnsavedChangesContext } from "@/components/providers/unsaved-changes-provider";

/**
 * Registers `isDirty` with the app-wide UnsavedChangesProvider so navigation
 * triggered from *outside* this form — sidebar links, the account menu,
 * browser Back/Forward, a hard refresh — gets the same confirmation prompt
 * as an in-form Cancel button. Returns `guardNavigation` for wrapping local
 * "leave" actions (a Cancel click, a back-link) so they go through the same
 * single, shared confirm dialog instead of each form owning its own.
 *
 * Safe to call even where no provider is mounted (guardNavigation just runs
 * the action immediately) — but the provider is mounted once at the app
 * root, so in practice every form gets full coverage automatically.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const id = useId();
  const ctx = useUnsavedChangesContext();

  // Cleanup unregisters on every dependency change, not just unmount — so a
  // dirty->clean transition (e.g. a successful save) clears this id right
  // away, and a form that unmounts while still dirty (e.g. its own
  // save-and-redirect) never leaves a stale entry blocking navigation.
  useEffect(() => {
    ctx?.setFormDirty(id, isDirty);
    return () => ctx?.setFormDirty(id, false);
  }, [ctx, id, isDirty]);

  return {
    guardNavigation: ctx?.guardNavigation ?? ((action: () => void) => action()),
  };
}
