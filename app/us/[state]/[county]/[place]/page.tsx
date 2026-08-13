// Town step — the end of the state -> county -> town drill-down (see
// app/us/[state]/[county]/page.tsx's town-picker map): the "full"
// PersonalizedResult variant on top (headline, share card, mini stat grid,
// compare chart, details toggle — this town's own percentile, computed
// client-side from whatever's already in the query string), then the
// town's static SEO content below — median income, its position vs
// county/state/national, sibling places. No generateStaticParams (32,000+
// places is far too slow to prerender); instead this ISR-caches each
// place's HTML for a day after its first real visit — same reasoning as
// the county page, and same rule: this SERVER COMPONENT must never read
// searchParams itself, or Next.js forces per-request dynamic rendering and
// the ISR cache never kicks in.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getStateByAbbr } from "@/data/us/stateMeta";
import { getCountyIncome, getPlaceIncome, getPlacesForCounty, type UsCountyIncome } from "@/lib/usCountyPlaceData";
import { getStateIncomePercentile, getNationalIncomePercentile, getPlaceIncomePercentileFromCounty, acs5YearRange } from "@/lib/usIncomeCalc";
import { getAppLocale, getLangForLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata, siteTitle, siteDescription } from "@/lib/seo";
import { translations, formatTemplate } from "@/lib/i18n";
import { formatUsd, stripStateSuffix } from "@/lib/usFormat";
import { getAllInsights } from "@/lib/insights";
import UsShell from "@/components/us/UsShell";
import Footer from "@/components/us/Footer";
import PersonalizedResult from "@/components/us/result/PersonalizedResult";

export const revalidate = 86400;

type Params = { state: string; county: string; place: string };

function resolveStateCounty(params: Params) {
  const state = getStateByAbbr(params.state);
  const county = state ? getCountyIncome(params.county) : null;
  if (!state || !county || county.stateFips !== state.fips) return null;
  return { state, county };
}

// A place fips that doesn't resolve, or resolves to a place outside this
// county (a stale/hand-edited URL), isn't a 404 — the county itself is real,
// so this falls back to "no town data" below rather than notFound().
function resolvePlace(params: Params, county: UsCountyIncome) {
  const place = getPlaceIncome(params.place);
  return place && place.countyFips === county.fips ? place : null;
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  // EXPERIMENT: hardcoded, no headers() call (matches the county page)
  const locale: "us" | "kr" = "us";
  const path = `/us/${params.state}/${params.county}/${params.place}`;
  const stateCounty = resolveStateCounty(params);
  if (!stateCounty) return pageMetadata(locale, path, siteTitle(locale), siteDescription(locale));

  const place = resolvePlace(params, stateCounty.county);
  if (!place) {
    // No real content to index at this URL — same "thin content" bar the
    // null-median case below already holds every place page to.
    return { ...pageMetadata(locale, path, siteTitle(locale), siteDescription(locale)), robots: { index: false, follow: true } };
  }

  const t = translations[getLangForLocale(locale)];
  const placeName = place.name;
  const title = formatTemplate(t.usPlacePageHeadingTemplate, { place: placeName });
  const description =
    place.medianHouseholdIncome != null
      ? formatTemplate(t.usPlaceMetaDescriptionTemplate, { place: placeName, median: formatUsd(place.medianHouseholdIncome) })
      : siteDescription(locale);

  const meta = pageMetadata(locale, path, title, description);
  // Thin/no-data pages (this place's B19013 estimate was too unreliable to
  // show, ~12% of places) aren't worth indexing — same bar the rest of /us
  // holds real content pages to.
  return place.medianHouseholdIncome == null ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default function UsPlacePage({ params }: { params: Params }) {
  const stateCounty = resolveStateCounty(params);
  if (!stateCounty) notFound();
  const { state, county } = stateCounty;
  const place = resolvePlace(params, county);

  // EXPERIMENT: hardcoded, no headers() call
  const lang = getLangForLocale("us");
  const t = translations[lang];
  const base = "/us";
  const countyHref = `${base}/${state.abbr}/${county.fips}`;

  if (!place) {
    return (
      <UsShell>
        <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
          <Link
            href={countyHref}
            className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
          >
            <ChevronLeft className="h-4 w-4" />
            {t.usPlaceBackToCounty}
          </Link>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-10 text-center">
            <p className="mb-1.5 text-[15px] font-semibold text-white/80">{t.usPlaceNoDataTitle}</p>
            <p className="mb-6 text-[13px] text-white/45">{t.usPlaceNoDataDesc}</p>
            <Link
              href={countyHref}
              className="inline-block rounded-md bg-[#34D399] px-6 py-2.5 text-[14px] font-semibold text-black transition-opacity hover:opacity-90"
            >
              {t.usPlaceNoDataCta}
            </Link>
          </div>
        </div>
        <Footer />
      </UsShell>
    );
  }

  const median = place.medianHouseholdIncome;
  // Where this place's own median lands within the county's income
  // distribution — `median` doubles as both the place's median (the curve
  // gets re-centered on it) and the "income" being ranked against it.
  const countyPercentile =
    median != null ? getPlaceIncomePercentileFromCounty(county.medianHouseholdIncome, county.percentileAnchors, median, median) : null;
  const statePercentile = median != null ? getStateIncomePercentile(state.fips, median) : null;
  const nationalPercentile = median != null ? getNationalIncomePercentile(median) : null;

  const placesForCounty = getPlacesForCounty(county.fips);
  const otherPlaces = placesForCounty
    .filter((p) => p.fips !== place.fips)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);

  const countyName = stripStateSuffix(county.name, state.name);
  const relatedArticles = getAllInsights(lang).slice(0, 2);

  return (
    <UsShell>
      <PersonalizedResult
        presetState={state}
        presetCounty={county}
        presetPlace={place}
        presetPlacesForCounty={placesForCounty}
        variant="full"
      />
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          href={countyHref}
          className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.usPlaceBackToCounty}
        </Link>

        <h1 className="mb-6 text-[24px] font-extrabold tracking-tight text-balance">
          {formatTemplate(t.usPlacePageHeadingTemplate, { place: stripStateSuffix(place.name, state.name) })}
        </h1>

        {median == null ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center">
            <p className="mb-1 text-[14px] font-semibold text-white/70">{t.usCountyNoDataTitle}</p>
            <p className="text-[12px] text-white/40">{t.usCountyNoDataDesc}</p>
          </div>
        ) : (
          <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-[13px] text-white/55">{t.usPlaceMedianLabel}</span>
              <span className="text-[18px] font-bold tabular-nums text-white">{formatUsd(median)}</span>
            </div>
            <div className="space-y-1.5 pt-3 text-[13px] leading-relaxed text-white/70">
              {countyPercentile != null && <p>{formatTemplate(t.usPlaceVsCountyTemplate, { percent: countyPercentile, county: countyName })}</p>}
              {statePercentile != null && <p>{formatTemplate(t.usPlaceVsStateTemplate, { percent: statePercentile, state: state.name })}</p>}
              {nationalPercentile != null && <p>{formatTemplate(t.usPlaceVsNationalTemplate, { percent: nationalPercentile })}</p>}
            </div>
          </div>
        )}

        {otherPlaces.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-[16px] font-bold text-white/90">{t.usPlaceOtherCitiesHeading}</h2>
            <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {otherPlaces.map((p) => (
                <li key={p.fips}>
                  <Link
                    href={`${base}/${state.abbr}/${county.fips}/${p.fips}`}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <span className="truncate">{stripStateSuffix(p.name, state.name)}</span>
                    {p.medianHouseholdIncome != null && (
                      <span className="shrink-0 tabular-nums text-white/40">{formatUsd(p.medianHouseholdIncome)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {relatedArticles.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-[16px] font-bold text-white/90">{t.usInsightsRelatedHeading}</h2>
            <div className="flex flex-col gap-3">
              {relatedArticles.map((a) => (
                <Link
                  key={a.slug}
                  href={`${base}/insights/${a.slug}`}
                  className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-[#34D399]/40"
                >
                  <h3 className="mb-1 text-[14px] font-bold text-white/90">{a.title}</h3>
                  <p className="text-[12px] leading-relaxed text-white/55">{a.description}</p>
                </Link>
              ))}
            </div>
            <Link
              href={`${base}/insights`}
              className="mt-3 inline-block text-[12px] text-white/40 transition-colors hover:text-white/70"
            >
              {t.usInsightsSeeAll} →
            </Link>
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
