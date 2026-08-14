"use client";
// The client half of AdSlot — pushes the actual <ins class="adsbygoogle">
// once it's mounted, and only on the production hostname (that check moved
// here from AdSlot; see lib/ads.ts for why). Not exported outside
// components/ads/: always go through AdSlot.tsx.
import { useEffect, useId } from "react";
import { getAdsenseClientId } from "@/lib/ads";
import { useIsProductionHost } from "./useIsProductionHost";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdUnit({
  slot,
  format,
  fullWidthResponsive,
}: {
  slot: string;
  format: string;
  fullWidthResponsive: boolean;
}) {
  const uid = useId();
  const isProduction = useIsProductionHost();
  const clientId = getAdsenseClientId();

  useEffect(() => {
    if (!isProduction || !clientId) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle.js hasn't loaded yet (or is blocked) — nothing to
      // recover from here, the <ins> just stays empty.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- push once per mounted slot instance
  }, [uid, isProduction, clientId]);

  if (!isProduction || !clientId) return null;

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", width: "100%", height: "100%" }}
      data-ad-client={clientId}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
    />
  );
}
