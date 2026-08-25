"use client";

import { useSearchParams } from "next/navigation";

/** Whether this page is rendered inside the embed widget's iframe. */
export function useIsEmbed(): boolean {
  return useSearchParams().get("embed") === "1";
}
