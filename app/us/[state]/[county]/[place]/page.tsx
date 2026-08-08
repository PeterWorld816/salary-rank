// SEO landing page for a single place (city/town/CDP) — mirrors
// app/us/[state]/[county]/page.tsx's pattern exactly (median income, position
// vs county/state/national, income thresholds, sibling places, CTA into the
// dashboard). No generateStaticParams (32,000+ places is far too slow to
// prerender); instead this ISR-caches each place's HTML for a day after its
// first real visit — same reasoning as the county page, and same rule: this
// page must never read searchParams, or Next.js forces per-request dynamic
// rendering and the ISR cache never kicks in.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getStateByAbbr } from "@/data/us/stateMeta";
import {
  getCountyIncome,
  getPlaceIncome,
  getPlacesForCounty,
  getStateIncomePercentile,
  getNationalIncomePercentile,
  getPlaceIncomePercentile,
  acs5YearRange,
} from "@/lib/usIncomeCalc";
import { getAppLocale, getLangForLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata, siteTitle, siteDescription } from "@/lib/seo";
import { translations, formatTemplate } from "@/lib/i18n";
import { formatUsd, stripStateSuffix } from "@/lib/usFormat";
import UsShell from "@/components/us/UsShell";
import Footer from "@/components/us/Footer";

export const revalidate = 86400;

type Params = { state: string; county: string; place: string };

function resolve(params: Params) {
  const state = getStateByAbbr(params.state);
  const county = state ? getCountyIncome(params.county) : null;
  const place = getPlaceIncome(params.place);
  if (!state || !county || county.stateFips !== state.fips || !place || place.countyFips !== county.fips) return null;
  return { state, county, place };
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  // EXPERIMENT: hardcoded, no headers() call (matches the county page)
  const locale: "us" | "kr" = "us";
  const path = `/us/${params.state}/${params.county}/${params.place}`;
  const resolved = resolve(params);
  if (!resolved) return pageMetadata(locale, path, siteTitle(locale), siteDescription(locale));

  const { place } = resolved;
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
  const resolved = resolve(params);
  if (!resolved) notFound();
  const { state, county, place } = resolved;

  // EXPERIMENT: hardcoded, no headers() call
  const lang = getLangForLocale("us");
  const t = translations[lang];
  const base = "/us";

  const median = place.medianHouseholdIncome;
  const countyPercentile = median != null ? getPlaceIncomePercentile(place.fips, median) : null;
  const statePercentile = median != null ? getStateIncomePercentile(state.fips, median) : null;
  const nationalPercentile = median != null ? getNationalIncomePercentile(median) : null;

  const otherPlaces = getPlacesForCounty(county.fips)
    .filter((p) => p.fips !== place.fips)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);

  const calculatorHref = `${base}/result?st=${state.abbr}&co=${county.fips}&pl=${place.fips}`;
  const countyName = stripStateSuffix(county.name, state.name);

  return (
    <UsShell>
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          href={`${base}/${state.abbr}/${county.fips}`}
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
          <>
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

            <div className="mb-8 rounded-xl border border-[#34D399]/25 bg-[#34D399]/[0.06] px-5 py-5 text-center">
              <p className="mb-1.5 text-[15px] font-bold text-white">
                {formatTemplate(t.usPlaceCtaHeadingTemplate, { place: stripStateSuffix(place.name, state.name) })}
              </p>
              <p className="mb-4 text-[13px] text-white/60">{t.usCountyCtaBody}</p>
              <Link
                href={calculatorHref}
                className="inline-block rounded-md bg-[#34D399] px-6 py-2.5 text-[14px] font-semibold text-black transition-opacity hover:opacity-90"
              >
                {t.usCountyCtaButton}
              </Link>
            </div>
          </>
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

        <div className="rounded-lg bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[12px] text-white/40">{formatTemplate(t.usSourceCensus, { range: acs5YearRange })}</p>
          <p className="mt-1 text-[12px] text-white/30">{t.usDisclaimer}</p>
        </div>

        <Footer />
      </div>
    </UsShell>
  );
}
