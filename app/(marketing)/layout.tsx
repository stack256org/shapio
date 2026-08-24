import type { ReactNode } from "react";
import { Footer } from "@/components/marketing/footer";
import { Nav } from "@/components/marketing/nav";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ir-background">
      <Nav />
      <main id="main-content">{children}</main>
      <Footer />
    </div>
  );
}
