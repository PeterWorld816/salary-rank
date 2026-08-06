"use client";
// The client half of AdSlot — pushes the actual <ins class="adsbygoogle">
// once it's mounted. Not exported outside components/ads/: always go
// through AdSlot.tsx, which does the production-domain gating this doesn't.
import { useEffect, useId } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdUnit({
  clientId,
  slot,
  format,
  fullWidthResponsive,
}: {
  clientId: string;
  slot: string;
  format: string;
  fullWidthResponsive: boolean;
}) {
  const uid = useId();

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle.js hasn't loaded yet (or is blocked) — nothing to
      // recover from here, the <ins> just stays empty.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- push once per mounted slot instance
  }, [uid]);

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
