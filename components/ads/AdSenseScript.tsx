"use client";
// Site-wide AdSense loader — mount once in app/layout.tsx. Renders nothing
// (not even a <script> tag) unless the browser is actually on
// NEXT_PUBLIC_SITE_URL's hostname, so this never fires on localhost,
// *.vercel.app previews, or any other non-production deploy — see lib/ads.ts.
//
// Client component on purpose: this sits in the root layout, and the host
// check it used to do with headers() made every route in the app render
// dynamically (killing ISR on the county/place pages).
import Script from "next/script";
import { getAdsenseClientId } from "@/lib/ads";
import { useIsProductionHost } from "./useIsProductionHost";

export default function AdSenseScript() {
  const isProduction = useIsProductionHost();
  const clientId = getAdsenseClientId();
  if (!isProduction || !clientId) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
