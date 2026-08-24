"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { UnsavedChangesProvider } from "@/components/providers/unsaved-changes-provider";
import { Toaster } from "@/components/ui/sonner";

// Single global source of truth for the app's Light/Dark preference.
// `attribute` drives both styling systems in lockstep from one localStorage
// value: `data-theme` for DaisyUI's compiled theme selectors and `class` for
// the `.dark` overrides in app/design-tokens.css. Mounted once here in the
// root layout — it never remounts on client-side navigation, so no page
// (including a Save-and-redirect flow) can reset it.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute={["data-theme", "class"]}
      defaultTheme="light"
      disableTransitionOnChange
      enableSystem={false}
    >
      <UnsavedChangesProvider>{children}</UnsavedChangesProvider>
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
}
