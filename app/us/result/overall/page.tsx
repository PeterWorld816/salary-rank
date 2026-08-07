import type { Metadata } from "next";
import { getAppLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata, resultOgImage } from "@/lib/seo";
import AdSlot from "@/components/ads/AdSlot";
import OverallResultClient from "./OverallResultClient";

const META = {
  us: {
    title: "Your Overall US Income Percentile",
    description: "See where your income ranks against the entire US population.",
  },
  kr: {
    title: "전체 소득 순위 — 미국 상위 몇 %?",
    description: "미국 전체 인구와 비교했을 때 당신의 소득 순위를 확인하세요.",
  },
} as const;

export function generateMetadata({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Metadata {
  const locale = getAppLocale();
  const m = META[locale];
  return pageMetadata(locale, getOriginalPathname(), m.title, m.description, { image: resultOgImage(locale, searchParams) });
}

export default function OverallResultPage() {
  // AdSlot is a Server Component (headers()-based production-host check) —
  // OverallResultClient is "use client", so it's rendered here and threaded
  // down as a prop instead of imported there directly.
  return <OverallResultClient adSlot={<AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT!} className="mb-8" />} />;
}
