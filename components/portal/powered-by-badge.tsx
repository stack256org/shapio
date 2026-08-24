import { PRODUCT_NAME } from "@/config/platform";

export function PoweredByBadge() {
  return (
    <span className="fixed right-4 bottom-4 z-20 flex items-center gap-1.5 rounded-ir-full border border-ir-border bg-ir-surface px-3 py-1.5 text-xs font-medium text-ir-muted shadow-ir-sm transition-colors duration-150 ease-ir-standard hover:text-ir-primary">
      Powered by {PRODUCT_NAME}
    </span>
  );
}
