"use client";
import { usePathname } from "next/navigation";

// Internal nav links are built with a hardcoded base ("/us/CA" etc). Since
// /kr/* renders the same tree via middleware.ts's rewrite, that base must
// track whichever prefix the user is actually on, or clicking through would
// silently bounce /kr visitors back to /us.
export function useLocaleBase(): "/us" | "/kr" {
  const pathname = usePathname();
  return pathname.startsWith("/kr") ? "/kr" : "/us";
}
