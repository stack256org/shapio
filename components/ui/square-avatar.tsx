"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SquareAvatarProps {
  alt?: string;
  className?: string;
  fallback: ReactNode;
  imageUrl?: string | null;
}

export function SquareAvatar({
  alt,
  className,
  fallback,
  imageUrl,
}: SquareAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!imageUrl && !failed;

  return (
    <div
      className={cn(
        "flex size-7 shrink-0 items-center justify-center overflow-hidden bg-ir-muted-surface text-xs font-semibold text-ir-muted",
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={alt ?? ""}
          className="size-full object-cover"
          onError={() => setFailed(true)}
          src={imageUrl}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
