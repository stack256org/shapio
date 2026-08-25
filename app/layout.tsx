import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { ImpersonateBanner } from "@/components/orbit/impersonate-banner";
import { Providers } from "@/components/providers";
import { SkipLink } from "@/components/ui/skip-link";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from "@/config/platform";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Geist is loaded for the design system's --font-ir-sans / --font-ir-mono
// tokens only (app/design-tokens.css). The site-wide active font stays
// Inter until pages are redesigned to consume the ir- tokens — see
// DESIGN-TOKENS.md.

export const metadata: Metadata = {
  title: {
    default: PRODUCT_NAME,
    template: `%s | ${PRODUCT_NAME}`,
  },
  description: PRODUCT_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={cn(
        "font-sans",
        inter.variable,
        GeistSans.variable,
        GeistMono.variable
      )}
      lang="en"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <SkipLink />
        <ImpersonateBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
