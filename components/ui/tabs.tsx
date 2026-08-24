"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const TabsContext = React.createContext<{
  value?: string;
  setValue: (value: string) => void;
} | null>(null);

function Tabs({
  className,
  orientation = "horizontal",
  value: controlledValue,
  defaultValue,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  orientation?: "horizontal" | "vertical";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div
        data-slot="tabs"
        data-orientation={orientation}
        className={cn(
          "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
          className,
        )}
        {...props}
      />
    </TabsContext.Provider>
  );
}

const TABS_LIST_BASE =
  "tabs group/tabs-list inline-flex w-fit flex-nowrap items-center justify-center text-ir-muted group-data-[orientation=horizontal]/tabs:h-10 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col";

export type TabsListVariant = "default" | "line";

const TABS_LIST_VARIANT_CLASSES: Record<TabsListVariant, string> = {
  default: "tabs-box",
  line: "tabs-border",
};

function tabsListVariants({
  variant = "default",
}: { variant?: TabsListVariant } = {}) {
  return cn(TABS_LIST_BASE, TABS_LIST_VARIANT_CLASSES[variant]);
}

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: TabsListVariant }) {
  return (
    <div
      data-slot="tabs-list"
      data-variant={variant}
      role="tablist"
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  value,
  onClick,
  onKeyDown,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("TabsTrigger must be used within Tabs");
  }
  const isActive = ctx.value === value;

  return (
    <button
      data-slot="tabs-trigger"
      data-active={isActive || undefined}
      role="tab"
      type="button"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      className={cn(
        "tab relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold tracking-wider whitespace-nowrap uppercase transition-all duration-150 ease-ir-standard group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start group-data-[orientation=vertical]/tabs:px-4 group-data-[orientation=vertical]/tabs:py-2 disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      onClick={(event) => {
        ctx.setValue(value);
        onClick?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          const list = event.currentTarget.closest('[role="tablist"]');
          const triggers = list
            ? Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
            : [];
          const currentIndex = triggers.indexOf(event.currentTarget);
          if (currentIndex !== -1 && triggers.length > 0) {
            const delta = event.key === "ArrowRight" ? 1 : -1;
            const next =
              triggers[(currentIndex + delta + triggers.length) % triggers.length];
            next?.focus();
            next?.click();
          }
          event.preventDefault();
        }
        onKeyDown?.(event);
      }}
      {...props}
    />
  );
}

function TabsContent({
  className,
  value,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx || ctx.value !== value) {
    return null;
  }
  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
