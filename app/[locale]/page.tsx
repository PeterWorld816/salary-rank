import type { Metadata } from "next";
import { getUsStatesGeo } from "@/lib/usGeo";
import { localeFromParams, localeBase } from "@/lib/serverLocale";
import { homeMetadata } from "@/lib/seo";
import UsHomeClient from "./UsHomeClient";
import AdSlot from "@/components/ads/AdSlot";

type Params = { locale: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  const locale = localeFromParams(params);
  return homeMetadata(locale, localeBase(locale));
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
