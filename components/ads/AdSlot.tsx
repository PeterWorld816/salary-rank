// Reusable ad placement — drop this anywhere a page wants an ad.
//
//   <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INSIGHTS!} />
//
// Renders nothing at all (no placeholder box either) unless both:
//   1. isProductionHost() — the request's Host matches NEXT_PUBLIC_SITE_URL
//   2. NEXT_PUBLIC_ADSENSE_CLIENT_ID is configured
// When it does render, the outer container has a fixed height set before
// any ad content loads, so there's no layout shift either way.
//
// This is a Server Component (it needs next/headers for the host check) —
// import and render it directly in a page.tsx or other Server Component.
// To use it inside a "use client" component (e.g. deep in the result flow),
// render <AdSlot /> in the nearest Server Component ancestor and pass it
// down as a prop/children instead of importing it into the client file.
import { adsEnabled, getAdsenseClientId } from "@/lib/ads";
import { AdUnit } from "./AdUnit";

export default function AdSlot({
  slot,
  height = 250,
  format = "auto",
  fullWidthResponsive = true,
  className,
}: {
  slot: string;
  height?: number;
  format?: string;
  fullWidthResponsive?: boolean;
  className?: string;
}) {
  const clientId = getAdsenseClientId();
  if (!adsEnabled() || !clientId) return null;

  return (
    <div className={className} style={{ height, overflow: "hidden" }}>
      <AdUnit clientId={clientId} slot={slot} format={format} fullWidthResponsive={fullWidthResponsive} />
    </div>
  );
}
