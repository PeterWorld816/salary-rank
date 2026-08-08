import type { Metadata } from "next";
import { getAppLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata, resultOgImage } from "@/lib/seo";
import AdSlot from "@/components/ads/AdSlot";
import DashboardResultClient from "./DashboardResultClient";

const META = {
  us: {
    title: "Your Complete US Income & Net Worth Dashboard",
    description: "See your income and net worth percentile nationwide, in your state and county, by age band, and against your 401(k) — all on one page.",
  },
  kr: {
    title: "미국 소득·자산 순위 대시보드",
    description: "전국·주·카운티·연령대 기준 소득 순위와 순자산·401(k) 비교까지 한 페이지에서 확인하세요.",
  },
} as const;

export function generateMetadata({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Metadata {
  const locale = getAppLocale();
  const m = META[locale];
  return pageMetadata(locale, getOriginalPathname(), m.title, m.description, { image: resultOgImage(locale, searchParams) });
}

export default function ResultDashboardPage() {
  // AdSlot is a Server Component (headers()-based production-host check) —
  // DashboardResultClient is "use client", so it's rendered here and threaded
  // down as a prop instead of imported there directly.
  return <DashboardResultClient adSlot={<AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT!} className="mb-8" />} />;
}
