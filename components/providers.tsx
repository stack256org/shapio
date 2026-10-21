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
      // next-themes renders an inline anti-flash <script>. The server-rendered
      // copy is the one that runs (it sets the theme before first paint); when
      // the provider renders on the client — hydration, or a remount — React 19
      // warns "Encountered a script tag while rendering React component" even
      // though a client-rendered script never executes. Giving the client copy
      // a non-JavaScript type makes React treat it as a data block and skip the
      // warning. Server output is unchanged, and the script already suppresses
      // hydration warnings. next-themes issue #387.
      scriptProps={
        typeof window === "undefined" ? undefined : { type: "application/json" }
      }
    >
      <UnsavedChangesProvider>{children}</UnsavedChangesProvider>
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
}
