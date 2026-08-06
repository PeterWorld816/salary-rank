// Site-wide AdSense loader — mount once in app/layout.tsx. Renders nothing
// (not even a <script> tag) unless the current request's Host header
// matches NEXT_PUBLIC_SITE_URL exactly, so this never fires on localhost,
// *.vercel.app previews, or any other non-production deploy — see lib/ads.ts.
import Script from "next/script";
import { adsEnabled, getAdsenseClientId } from "@/lib/ads";

export default function AdSenseScript() {
  if (!adsEnabled()) return null;
  const clientId = getAdsenseClientId();

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
