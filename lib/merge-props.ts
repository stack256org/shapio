// Reproduces Radix Slot's own prop-merge algorithm, for components that
// clone a single child element instead of rendering their own DOM node
// (Radix's "asChild" pattern). The child's explicit props win on plain
// conflicts, className/style merge, and same-name event handlers compose
// (child's handler runs first, then the owner's).
import { cn } from "@/lib/utils";

export function mergeProps(
  ownProps: Record<string, unknown>,
  childProps: Record<string, unknown>
) {
  const merged: Record<string, unknown> = { ...ownProps, ...childProps };
  for (const key of Object.keys(childProps)) {
    const ownValue = ownProps[key];
    const childValue = childProps[key];
    if (
      /^on[A-Z]/.test(key) &&
      typeof ownValue === "function" &&
      typeof childValue === "function"
    ) {
      merged[key] = (...args: unknown[]) => {
        (childValue as (...a: unknown[]) => void)(...args);
        (ownValue as (...a: unknown[]) => void)(...args);
      };
    } else if (key === "className") {
      merged[key] = cn(ownValue as string, childValue as string);
    } else if (key === "style") {
      merged[key] = { ...(ownValue as object), ...(childValue as object) };
    }
  }
  return merged;
}
