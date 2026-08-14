import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStateByAbbr, US_STATES } from "@/data/us/stateMeta";
import { getUsCountiesGeoForState } from "@/lib/usGeo";
import { getCountiesForState } from "@/lib/usCountyPlaceData";
import { getStateIncome, getNationalIncomePercentile } from "@/lib/usIncomeCalc";
import { getAppLocale, getLangForLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata, siteTitle, siteDescription, locationOgImage } from "@/lib/seo";
import { formatTemplate, translations } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";
import UsStateClient from "./UsStateClient";
import AdSlot from "@/components/ads/AdSlot";

// Prerenders all 51 states at build time (confirmed via `next build`'s "●"
// SSG marker) and, along with getStateByAbbr's notFound() below, keeps
// unknown slugs 404ing instead of being treated as arbitrary dynamic params.
// Server-only calls further down the tree that read headers()/cookies()
// (getAppLocale() in generateMetadata, AdSlot's production-host check) still
// run per-request on top of that prerendered shell — verified by curling
// this route with different Host headers and seeing the ad gate correctly.
export function generateStaticParams() {
  return US_STATES.map((s) => ({ state: s.abbr }));
}

export function generateMetadata({ params }: { params: { state: string } }): Metadata {
  const locale = getAppLocale();
  const state = getStateByAbbr(params.state);
  const title = state ? `${state.name} — ${siteTitle(locale)}` : siteTitle(locale);
  const median = state ? getStateIncome(state.fips)?.medianHouseholdIncome ?? null : null;
  const percentile = median != null ? getNationalIncomePercentile(median) : null;

  const description =
    state && median != null
      ? formatTemplate(translations[getLangForLocale(locale)].usStateIncomeIntroTemplate, {
          state: state.name,
          median: formatUsd(median),
          percent: percentile ?? "—",
        })
      : siteDescription(locale);

  // Real per-state numbers (median income, its national percentile) instead
  // of the static og-us.png/og-kr.png fallback — see app/us/og/route.tsx's
  // "location mode".
  const image = state ? locationOgImage(locale, { locationName: state.name, medianHouseholdIncome: median, percentile }) : undefined;

  return pageMetadata(locale, getOriginalPathname(), title, description, { image });
}

export default function UsStatePage({ params }: { params: { state: string } }) {
  const state = getStateByAbbr(params.state);
  if (!state) notFound();

  const geo = getUsCountiesGeoForState(state.fips);
  const counties = getCountiesForState(state.fips);
  return (
    <UsStateClient
      state={state}
      geo={geo}
      counties={counties}
      // AdSlot is a Server Component (reads headers() for the production-host
      // check) — UsStateClient is "use client" and can't import it directly,
      // so it's rendered here and threaded down as a prop instead.
      countyListAdSlot={<AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_GEO!} className="mb-8" />}
    />
  );
}
