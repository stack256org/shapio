import Image from "next/image";
import { LOGO_PATH, LOGO_PATH_DARK, PRODUCT_NAME } from "@/config/platform";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  priority?: boolean;
}

// Swaps between the light/dark logo PNGs purely via CSS (`dark:` variant
// driven by the `.dark` class next-themes puts on <html>), so it renders
// correctly with no client JS and no hydration flicker in both Server and
// Client Components.
export function Logo({ className, priority }: LogoProps) {
  return (
    <>
      <Image
        alt={PRODUCT_NAME}
        className={cn("dark:hidden", className)}
        height={169}
        priority={priority}
        src={LOGO_PATH}
        unoptimized
        width={480}
      />
      <Image
        alt={PRODUCT_NAME}
        className={cn("hidden dark:block", className)}
        height={169}
        priority={priority}
        src={LOGO_PATH_DARK}
        unoptimized
        width={480}
      />
    </>
  );
}
