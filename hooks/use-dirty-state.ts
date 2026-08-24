import { useCallback, useState } from "react";

/**
 * Tracks whether `values` has changed from the last saved baseline, so a
 * Save/Update button can stay disabled until something actually changed —
 * and go back to disabled after a successful save.
 *
 * Callers pass their current field values as a plain object each render
 * (built from whatever useState fields the form already has — no need to
 * restructure existing state into a single object). After a successful
 * save, call `markClean(values)` to accept those values as the new
 * baseline. `markClean` has a stable identity (safe in a useEffect
 * dependency array) since it never closes over the latest `values` —
 * callers always pass the baseline to adopt explicitly. The returned
 * `baseline` lets a Discard action restore each field's setState to the
 * last-saved value instead of reloading the page.
 */
export function useDirtyState<T extends Record<string, unknown>>(values: T) {
  const [baseline, setBaseline] = useState<T>(values);

  const isDirty =
    Object.keys(values).length !== Object.keys(baseline).length ||
    Object.keys(values).some((key) => values[key] !== baseline[key]);

  const markClean = useCallback((next: T) => setBaseline(next), []);

  return { baseline, isDirty, markClean };
}
