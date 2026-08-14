// Reusable ad placement — drop this anywhere a page wants an ad.
//
//   <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INSIGHTS!} />
//
// Renders nothing at all (no placeholder box either) unless AdSense is
// configured for this build — NEXT_PUBLIC_ADSENSE_CLIENT_ID and
// NEXT_PUBLIC_SITE_URL. When it does render, the outer container has a fixed
// height set before any ad content loads, so there's no layout shift.
//
// The second half of the gate — "is this actually the production host?" —
// happens inside AdUnit, in the browser. It used to happen here via
// headers(), which is a dynamic API and therefore disabled static rendering
// for every route that rendered an AdSlot (see lib/ads.ts). The trade-off:
// on a preview deploy built with the same env vars, the reserved box renders
// empty instead of collapsing. Production is unaffected, and no ad request
// is made off the production domain either way.
//
// This is still a Server Component, so it can't be imported from a "use
// client" file — render <AdSlot /> in the nearest Server Component ancestor
// and pass it down as a prop/children instead.
import { adsConfigured } from "@/lib/ads";
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
  if (!adsConfigured()) return null;

  return (
    <div className={className} style={{ height, overflow: "hidden" }}>
      <AdUnit slot={slot} format={format} fullWidthResponsive={fullWidthResponsive} />
    </div>
  );
}
