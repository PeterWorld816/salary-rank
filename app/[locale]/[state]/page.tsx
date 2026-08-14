import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStateByAbbr, US_STATES } from "@/data/us/stateMeta";
import { getUsCountiesGeoForState } from "@/lib/usGeo";
import { getCountiesForState } from "@/lib/usCountyPlaceData";
import { getStateIncome, getNationalIncomePercentile } from "@/lib/usIncomeCalc";
import { localeFromParams, localeBase, getLangForLocale } from "@/lib/serverLocale";
import { pageMetadata, siteTitle, siteDescription, locationOgImage } from "@/lib/seo";
import { formatTemplate, translations } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";
import UsStateClient from "./UsStateClient";
import AdSlot from "@/components/ads/AdSlot";

// Prerenders all 51 states, per locale, at build time — the [locale] segment
// above supplies { locale } and Next.js crosses it with these state slugs
// (102 paths total; see app/[locale]/layout.tsx). Along with getStateByAbbr's
// notFound() below, this also keeps unknown slugs 404ing instead of being
// treated as arbitrary dynamic params.
//
// Nothing in this route's tree may read headers()/cookies(): a single dynamic
// API call anywhere below (page, metadata, or a shared component like AdSlot)
// silently turns these prerenders back into per-request renders. Verify with
// `next build` AND a `curl -I` for Cache-Control — the "●" marker alone is
// NOT proof, it still prints for routes that bailed out to dynamic.
export function generateStaticParams() {
  return US_STATES.map((s) => ({ state: s.abbr }));
}

type Params = { locale: string; state: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  const locale = localeFromParams(params);
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

  // Canonical uses the state's own (lowercase) slug rather than the raw param,
  // so an uppercase /us/CA hit still points at the /us/ca the sitemap lists.
  const path = `${localeBase(locale)}/${state ? state.abbr : params.state}`;
  return pageMetadata(locale, path, title, description, { image });
}

export default function UsStatePage({ params }: { params: Params }) {
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
