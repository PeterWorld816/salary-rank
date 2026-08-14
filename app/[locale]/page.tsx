import type { Metadata } from "next";
import { getUsStatesGeo } from "@/lib/usGeo";
import { getAppLocale, getOriginalPathname } from "@/lib/serverLocale";
import { homeMetadata } from "@/lib/seo";
import UsHomeClient from "./UsHomeClient";
import AdSlot from "@/components/ads/AdSlot";

export function generateMetadata(): Metadata {
  return homeMetadata(getAppLocale(), getOriginalPathname());
}

export default function UsPage() {
  const geo = getUsStatesGeo();
  return (
    <UsHomeClient
      geo={geo}
      // AdSlot is a Server Component (headers()-based production-host
      // check) — UsHomeClient is "use client" and can't import it directly,
      // so it's rendered here and threaded down as a prop instead, same
      // pattern as the state page's countyListAdSlot.
      adSlot={<AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME!} className="mb-8" />}
    />
  );
}
