"use client";
// Client-side replacement for the old server-side Host-header check in
// lib/ads.ts. Returns false during SSR/prerender and on the first client
// render, then flips to true after mount only on the production hostname —
// so nothing ad-related ever ships in prerendered HTML, and no AdSense
// request is made from localhost or a preview deploy.
import { useEffect, useState } from "react";
import { getProductionHost } from "@/lib/ads";

export function useIsProductionHost(): boolean {
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    const expected = getProductionHost();
    setIsProduction(expected != null && window.location.hostname.toLowerCase() === expected);
  }, []);

  return isProduction;
}
