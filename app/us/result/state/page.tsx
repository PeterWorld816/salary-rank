import type { Metadata } from "next";
import { getAppLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata, resultOgImage } from "@/lib/seo";
import AdSlot from "@/components/ads/AdSlot";
import StateResultClient from "./StateResultClient";

const META = {
  us: {
    title: "Your Income Rank In Your County & State",
    description: "See how your income compares to people in your own county and state.",
  },
  kr: {
    title: "같은 카운티·주 내 소득 순위",
    description: "당신이 선택한 카운티·주 주민들과 소득을 비교해보세요.",
  },
} as const;

export function generateMetadata({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Metadata {
  const locale = getAppLocale();
  const m = META[locale];
  return pageMetadata(locale, getOriginalPathname(), m.title, m.description, { image: resultOgImage(locale, searchParams) });
}

export default function StateResultPage() {
  return <StateResultClient adSlot={<AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT!} className="mb-8" />} />;
}
