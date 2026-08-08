// SEO landing page for a single county — median income, its position vs the
// state/national distributions, income thresholds, nearby counties, and a
// CTA into the calculator (/us/result/**). No generateStaticParams (3,144
// counties is too slow to prerender at build time); instead this ISR-caches
// each county's HTML for a day after its first real visit. That only works
// if this page never reads searchParams — reading it anywhere forces Next.js
// to render fully per-request, bypassing the ISR cache — so the one thing
// this route used to do with the query string (the old single-page result
// URL's `?d=` redirect) now happens in middleware.ts instead, before the
// request ever reaches here.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getStateByAbbr } from "@/data/us/stateMeta";
import { getCountyIncome, getStateIncomePercentile, getNationalIncomePercentile, acs5YearRange } from "@/lib/usIncomeCalc";
import { getValueAtPercentile } from "@/lib/percentileTable";
import { getAdjacentCountyFips } from "@/lib/usGeo";
import { getAppLocale, getLangForLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata, siteTitle, siteDescription } from "@/lib/seo";
import { translations, formatTemplate } from "@/lib/i18n";
import { formatUsd, stripStateSuffix } from "@/lib/usFormat";
import { PercentileThresholds } from "@/components/us/PercentileThresholds";
import UsShell from "@/components/us/UsShell";
import Footer from "@/components/us/Footer";
import AdSlot from "@/components/ads/AdSlot";

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

  const calculatorHref = `${base}/result?st=${state.abbr}&co=${county.fips}`;

  return (
    <UsShell>
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

            {/* EXPERIMENT: AdSlot temporarily removed to isolate its effect */}

            <div className="mb-8 rounded-xl border border-[#34D399]/25 bg-[#34D399]/[0.06] px-5 py-5 text-center">
              <p className="mb-1.5 text-[15px] font-bold text-white">
                {formatTemplate(t.usCountyCtaHeadingTemplate, { county: stripStateSuffix(county.name, state.name) })}
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
