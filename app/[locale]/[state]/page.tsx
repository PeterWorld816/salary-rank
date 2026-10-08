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
import { buildStateDeepDive } from "@/lib/seo-pages/stateDeepDive";
import { isWithheldFromSearch } from "@/lib/seo-pages/gate";
import StateDeepDive from "@/components/seo/StateDeepDive";
import { BreadcrumbJsonLd } from "@/components/seo/SeoArticle";
import { getNearbyRankedStates } from "@/lib/usIncomeCalc";
import { getStateByFips } from "@/data/us/stateMeta";

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
  const meta = pageMetadata(locale, path, title, description, { image });
  // The quality gate (scripts/seoQualityGate.ts) withholds a state page from
  // search if its deep-dive block fails; it's still served.
  return locale === "us" && state && isWithheldFromSearch(`/us/${state.abbr}`) ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default function UsStatePage({ params }: { params: Params }) {
  const state = getStateByAbbr(params.state);
  if (!state) notFound();

  const geo = getUsCountiesGeoForState(state.fips);
  const counties = getCountiesForState(state.fips);
  // English deep dive for the indexed /us page only (see lib/seo-pages/).
  const deepDivePage = localeFromParams(params) === "us" ? buildStateDeepDive(state, counties) : null;
  const links = [
    ...getNearbyRankedStates(state.fips, 2)
      .map((s) => getStateByFips(s.fips))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => ({ href: `/us/${s.abbr}`, label: `${s.name} income` })),
    { href: "/us/occupations", label: "Salary by occupation" },
    { href: "/us/net-worth", label: "Net worth by age" },
    { href: "/us/insights/state-median-income-rankings", label: "State median income rankings" },
  ];
  return (
    <>
    {localeFromParams(params) === "us" && (
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/us" }, { name: state.name, path: `/us/${state.abbr}` }]} />
    )}
    <UsStateClient
      deepDive={deepDivePage ? <StateDeepDive page={deepDivePage} links={links} /> : null}
      state={state}
      geo={geo}
      counties={counties}
      // AdSlot is a Server Component (reads headers() for the production-host
      // check) — UsStateClient is "use client" and can't import it directly,
      // so it's rendered here and threaded down as a prop instead.
      countyListAdSlot={<AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_GEO!} className="mb-8" />}
    />
    </>
  );
}
