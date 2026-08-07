import type { Metadata } from "next";
import { getAppLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata, resultOgImage } from "@/lib/seo";
import AdSlot from "@/components/ads/AdSlot";
import DemographicResultClient from "./DemographicResultClient";

const META = {
  us: {
    title: "Your Income Rank By Age & Gender, Plus Net Worth",
    description: "Compare against your age band and gender, then see your net worth and 401(k) rank.",
  },
  kr: {
    title: "연령·성별 소득 순위, 순자산·401(k) 비교",
    description: "같은 연령대·성별 기준으로 소득을 비교하고, 순자산과 401(k)까지 확인하세요.",
  },
} as const;

export function generateMetadata({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Metadata {
  const locale = getAppLocale();
  const m = META[locale];
  return pageMetadata(locale, getOriginalPathname(), m.title, m.description, { image: resultOgImage(locale, searchParams) });
}

export default function DemographicResultPage() {
  return <DemographicResultClient adSlot={<AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT!} className="mt-8" />} />;
}
