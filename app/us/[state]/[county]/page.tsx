// County step of the state -> county -> town drill-down: a compact
// PersonalizedResult ("compact" variant — income/net-worth top-% only, see
// that file) up top, computed client-side from whatever's already in the
// query string, then the county's static SEO content — median income vs
// state/national, income thresholds — and finally the town-picker map (or a
// "no town-level data" message) that continues the drill-down into
// /us/[state]/[county]/[place], which is where the full personalized result
// lives. No generateStaticParams (3,144 counties is too slow to prerender
// at build time); instead this ISR-caches each county's HTML for a day
// after its first real visit. That only works if THIS SERVER COMPONENT
// never reads searchParams itself (reading it anywhere forces Next.js to
// render fully per-request, bypassing the ISR cache) — PersonalizedResult
// reads them client-side instead, inside its own Suspense boundary, so only
// that subtree opts out of the static render. The old single-page result
// URL's `?d=` redirect happens in middleware.ts, before the request ever
// reaches here.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getStateByAbbr } from "@/data/us/stateMeta";
import {
  getCountyIncome,
  getStateIncomePercentile,
  getNationalIncomePercentile,
  getPlacesForCounty,
  acs5YearRange,
} from "@/lib/usIncomeCalc";
import { getValueAtPercentile } from "@/lib/percentileTable";
import { getAdjacentCountyFips, getUsCountiesGeoForState } from "@/lib/usGeo";
import { getAppLocale, getLangForLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata, siteTitle, siteDescription } from "@/lib/seo";
import { translations, formatTemplate } from "@/lib/i18n";
import { formatUsd, stripStateSuffix } from "@/lib/usFormat";
import { PercentileThresholds } from "@/components/us/PercentileThresholds";
import PlaceSearchList from "@/components/us/PlaceSearchList";
import TownPickerMap from "@/components/us/TownPickerMap";
import UsShell from "@/components/us/UsShell";
import Footer from "@/components/us/Footer";
import PersonalizedResult from "@/components/us/result/PersonalizedResult";

export const revalidate = 86400;

type Params = { state: string; county: string };

function resolve(params: Params) {
  const state = getStateByAbbr(params.state);
  const county = state ? getCountyIncome(params.county) : null;
  if (!state || !county || county.stateFips !== state.fips) return null;
  return { state, county };
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  // EXPERIMENT: hardcoded, no headers() call
  const locale: "us" | "kr" = "us";
  const resolved = resolve(params);
  if (!resolved) return pageMetadata(locale, `/us/${params.state}/${params.county}`, siteTitle(locale), siteDescription(locale));

  const { county } = resolved;
  const t = translations[getLangForLocale(locale)];
  const title = formatTemplate(t.usCountyPageHeadingTemplate, { county: county.name });
  const description =
    county.medianHouseholdIncome != null
      ? formatTemplate(t.usCountyMetaDescriptionTemplate, { county: county.name, median: formatUsd(county.medianHouseholdIncome) })
      : siteDescription(locale);

  return pageMetadata(locale, `/us/${params.state}/${params.county}`, title, description);
}

export default function UsCountyPage({ params }: { params: Params }) {
  const resolved = resolve(params);
  if (!resolved) notFound();
  const { state, county } = resolved;

  // EXPERIMENT: hardcoded, no headers() call
  const lang = getLangForLocale("us");
  const t = translations[lang];
  const base = "/us";

  const median = county.medianHouseholdIncome;
  const statePercentile = median != null ? getStateIncomePercentile(state.fips, median) : null;
  const nationalPercentile = median != null ? getNationalIncomePercentile(median) : null;

  const thresholdRows = [1, 5, 10, 25]
    .map((percent) => {
      const amount = getValueAtPercentile(county.percentileAnchors, percent);
      return amount != null ? { percent, amount } : null;
    })
    .filter((row): row is { percent: number; amount: number } => row != null);

  const nearbyCounties = getAdjacentCountyFips(county.fips, 5)
    .map((fips) => getCountyIncome(fips))
    .filter((c): c is NonNullable<typeof c> => c != null);

  const placeHrefBase = `${base}/${state.abbr}/${county.fips}`;

  const places = getPlacesForCounty(county.fips)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const placeItems = places.map((p) => ({
    id: p.fips,
    name: stripStateSuffix(p.name, state.name),
    sub: p.medianHouseholdIncome != null ? formatUsd(p.medianHouseholdIncome) : undefined,
  }));

  // Single-feature FeatureCollection for TownPickerMap's `fit` projection —
  // undefined on the rare county whose FIPS isn't in us-atlas's topology,
  // in which case the plain PlaceSearchList below is used as a fallback.
  const countyFeature = getUsCountiesGeoForState(state.fips).features.find((f) => String(f.id) === county.fips);
  const countyGeo = countyFeature ? { type: "FeatureCollection" as const, features: [countyFeature] } : null;

  return (
    <UsShell>
      <PersonalizedResult presetState={state} presetCounty={county} variant="compact" />
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          href={`${base}/${state.abbr}`}
          className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.usBackToStateMap}
        </Link>

        <h1 className="mb-6 text-[24px] font-extrabold tracking-tight text-balance">
          {formatTemplate(t.usCountyPageHeadingTemplate, { county: county.name })}
        </h1>

        {median == null ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center">
            <p className="mb-1 text-[14px] font-semibold text-white/70">{t.usCountyNoDataTitle}</p>
            <p className="text-[12px] text-white/40">{t.usCountyNoDataDesc}</p>
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-[13px] text-white/55">{t.usCountyMedianLabel}</span>
                <span className="text-[18px] font-bold tabular-nums text-white">{formatUsd(median)}</span>
              </div>
              <div className="space-y-1.5 pt-3 text-[13px] leading-relaxed text-white/70">
                {statePercentile != null && (
                  <p>{formatTemplate(t.usCountyVsStateTemplate, { percent: statePercentile, state: state.name })}</p>
                )}
                {nationalPercentile != null && <p>{formatTemplate(t.usCountyVsNationalTemplate, { percent: nationalPercentile })}</p>}
              </div>
            </div>

            {thresholdRows.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-[16px] font-bold text-white/90">{t.usCountyThresholdsHeading}</h2>
                <PercentileThresholds rows={thresholdRows} topPercentTemplate={t.topPercentTemplate} />
              </div>
            )}
          </>
        )}

        <div className="mb-8">
          {places.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center">
              <p className="mb-1 text-[14px] font-semibold text-white/70">{t.usCountyNoPlaceDataTitle}</p>
              <p className="text-[12px] text-white/40">{t.usCountyNoPlaceDataDesc}</p>
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-[16px] font-bold text-white/90">
                {formatTemplate(t.usCountyPlaceListHeadingTemplate, { county: stripStateSuffix(county.name, state.name) })}
              </h2>
              <p className="mb-4 text-[13px] text-white/45">{t.usCountyPlaceListHint}</p>
              {countyGeo ? (
                <TownPickerMap
                  stateName={state.name}
                  countyName={stripStateSuffix(county.name, state.name)}
                  countyGeo={countyGeo}
                  places={places}
                  placeHrefBase={placeHrefBase}
                />
              ) : (
                <PlaceSearchList
                  items={placeItems}
                  resultHrefBase={placeHrefBase}
                  searchPlaceholder={t.usSearchPlacePlaceholder}
                  emptyText={t.usListNoResults}
                />
              )}
            </>
          )}
        </div>

        {nearbyCounties.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-[16px] font-bold text-white/90">{t.usCountyNearbyHeading}</h2>
            <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {nearbyCounties.map((c) => (
                <li key={c.fips}>
                  <Link
                    href={`${base}/${state.abbr}/${c.fips}`}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <span className="truncate">{stripStateSuffix(c.name, state.name)}</span>
                    {c.medianHouseholdIncome != null && (
                      <span className="shrink-0 tabular-nums text-white/40">{formatUsd(c.medianHouseholdIncome)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[12px] text-white/40">{formatTemplate(t.usSourceCensus, { range: acs5YearRange })}</p>
          <p className="mt-1 text-[12px] text-white/30">{t.usDisclaimer}</p>
        </div>

        <Footer />
      </div>
    </UsShell>
  );
}
