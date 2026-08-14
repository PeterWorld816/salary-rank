import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { localeFromParams, localeBase } from "@/lib/serverLocale";
import { pageMetadata, resultOgImage } from "@/lib/seo";
import AdSlot from "@/components/ads/AdSlot";
import PersonalizedResult from "@/components/us/result/PersonalizedResult";

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

type Params = { locale: string };
type SearchParams = Record<string, string | string[] | undefined>;

export function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }): Metadata {
  const locale = localeFromParams(params);
  const m = META[locale];
  return pageMetadata(locale, `${localeBase(locale)}/result`, m.title, m.description, { image: resultOgImage(locale, searchParams) });
}

// /us/result?st=&co=(&pl=) used to be the whole dashboard; that content now
// lives at the top of /us/[state]/[county](/[place]) instead (see those
// routes' page.tsx), so old shared links pointing here permanently redirect
// there, carrying every other param (d, lang, from) along. A bare
// /us/result?d=... with no st/co is still real, though — the nationwide-only
// result for a visitor who skipped the map entirely via UsInputPanel's "See
// national result" CTA has no state/county page to redirect to.
export default function ResultDashboardPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const prefix = localeBase(localeFromParams(params));
  const st = typeof searchParams.st === "string" ? searchParams.st : undefined;
  const co = typeof searchParams.co === "string" ? searchParams.co : undefined;
  const pl = typeof searchParams.pl === "string" ? searchParams.pl : undefined;

  if (st && co) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "st" || key === "co" || key === "pl" || typeof value !== "string") continue;
      params.set(key, value);
    }
    const qs = params.toString();
    const path = pl ? `${prefix}/${st}/${co}/${pl}` : `${prefix}/${st}/${co}`;
    permanentRedirect(qs ? `${path}?${qs}` : path);
  }

  // AdSlot is a Server Component (headers()-based production-host check) —
  // PersonalizedResult is "use client", so it's rendered here and threaded
  // down as a prop instead of imported there directly.
  return <PersonalizedResult adSlot={<AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT!} className="mb-8" />} />;
}
