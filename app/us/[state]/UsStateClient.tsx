"use client";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { FeatureCollection, Geometry } from "geojson";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import { formatTemplate } from "@/lib/i18n";
import UsShell from "@/components/us/UsShell";
import CompactResultCard from "@/components/us/result/CompactResultCard";
import CompactInsightSection from "@/components/us/result/CompactInsightSection";
import UsMap, { type UsMapFeatureProps } from "@/components/us/UsMap";
import UsGeoList from "@/components/us/UsGeoList";
import IncomeLegend from "@/components/us/IncomeLegend";
import Footer from "@/components/us/Footer";
import Spinner from "@/components/Spinner";
import { getStateByFips, type StateMeta } from "@/data/us/stateMeta";
import {
  getStateIncome,
  getNationalIncomePercentile,
  getStateIncomeRank,
  getNearbyRankedStates,
  acs5YearRange,
  acs1Vintage,
  type UsCountyIncome,
} from "@/lib/usIncomeCalc";
import { getValueAtPercentile } from "@/lib/percentileTable";
import { buildCountyHref } from "@/components/us/result/useResultLocation";
import { incomeFill } from "@/components/us/colorScale";
import { formatUsd, stripStateSuffix } from "@/lib/usFormat";
import { PercentileThresholds } from "@/components/us/PercentileThresholds";

function UsStateContent({
  state, geo, counties, countyListAdSlot,
}: {
  state: StateMeta;
  geo: FeatureCollection<Geometry, UsMapFeatureProps>;
  // This state's counties only (resolved server-side, see
  // app/us/[state]/page.tsx) — the full 3,144-county dataset is server-only
  // (lib/usCountyPlaceData.ts) precisely because it's too large to ship to
  // every /us/[state] visitor just to render one state's map.
  counties: UsCountyIncome[];
  countyListAdSlot?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const sp = useSearchParams();
  const qs = sp.toString();
  const base = useLocaleBase();

  const countyByFips = useMemo(() => new Map(counties.map((c) => [c.fips, c])), [counties]);
  const values = counties.map((c) => c.medianHouseholdIncome).filter((v): v is number => v != null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

  const countyItems = counties
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({
      id: c.fips,
      name: stripStateSuffix(c.name, state.name),
      sub: c.medianHouseholdIncome != null ? formatUsd(c.medianHouseholdIncome) : undefined,
    }));

  const stateIncome = getStateIncome(state.fips);

  const nationalPercentile =
    stateIncome?.medianHouseholdIncome != null ? getNationalIncomePercentile(stateIncome.medianHouseholdIncome) : null;

  const thresholdRows = stateIncome
    ? [10, 25, 50]
        .map((percent) => {
          const amount = getValueAtPercentile(stateIncome.percentileAnchors, percent);
          return amount != null ? { percent, amount } : null;
        })
        .filter((row): row is { percent: number; amount: number } => row != null)
    : [];

  // "Where does this state rank against the other 50?" — real data, not
  // just "vs. the nation" — see lib/usIncomeCalc.ts's getStateIncomeRank/
  // getNearbyRankedStates (both already exclude Puerto Rico, which
  // stateIncome.json carries but this site has no page for).
  const stateRank = getStateIncomeRank(state.fips);
  const nearbyStates = getNearbyRankedStates(state.fips, 2);

  // Picking a county opens its merged SEO+result page — see
  // app/us/[state]/[county]/page.tsx.
  function getHref(fips: string) {
    return buildCountyHref(base, sp, state.abbr, fips);
  }

  function getLabel(fips: string) {
    const feature = geo.features.find((f) => String(f.id) === fips);
    const name = feature?.properties?.name ?? fips;
    const income = countyByFips.get(fips);
    return income?.medianHouseholdIncome ? `${name} — $${income.medianHouseholdIncome.toLocaleString("en-US")}` : name;
  }

  function getFill(fips: string) {
    return incomeFill(countyByFips.get(fips)?.medianHouseholdIncome ?? null, min, max);
  }

  // Single navigation entry point shared by both the map (Geography onClick)
  // and the search list (row onClick) — see step 4 of the mobile UX rework.
  function handleSelect(fips: string) {
    router.push(getHref(fips));
  }

  return (
    <UsShell>
      <CompactResultCard presetState={state} presetCounty={null} />

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          href={qs ? `${base}?${qs}` : base}
          className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.usBackToUsMap}
        </Link>

        <h1 className="mb-2 text-[26px] font-extrabold tracking-tight text-balance">
          {formatTemplate(t.usStateMapTitleTemplate, { state: state.name })}
        </h1>
        <p className="mb-6 max-w-xl text-[15px] text-white/55">{t.usStateMapHint}</p>

        {/* This SEO copy doesn't touch searchParams itself — confirmed via
            `next build` + curl that it's present in the prerendered HTML for
            every state (data/us/*, unlike ?st=/?co=/?d=, is known at build
            time either way). Keep it that way: reading `sp`/`qs` here would
            risk it silently degrading to a client-only render for crawlers
            that don't execute JS. */}
        {stateIncome?.medianHouseholdIncome != null && (
          <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-[14px] leading-relaxed text-white/70">
              {formatTemplate(t.usStateIncomeIntroTemplate, {
                state: state.name,
                median: formatUsd(stateIncome.medianHouseholdIncome),
                percent: nationalPercentile ?? "—",
              })}
            </p>
            {thresholdRows.length > 0 && (
              <>
                <p className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wide text-white/45">
                  {formatTemplate(t.usStateThresholdsHeadingTemplate, { state: state.name })}
                </p>
                <PercentileThresholds rows={thresholdRows} topPercentTemplate={t.topPercentTemplate} />
              </>
            )}

            {stateRank && (
              <div className="mt-5 border-t border-white/[0.06] pt-4">
                <p className="text-[14px] leading-relaxed text-white/70">
                  {formatTemplate(t.usStateRankTemplate, { state: state.name, rank: stateRank.rank, total: stateRank.total })}
                </p>
                {nearbyStates.length > 0 && (
                  <>
                    <p className="mb-2 mt-4 text-[12px] font-semibold uppercase tracking-wide text-white/45">
                      {t.usStateNearbyRankedHeading}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {nearbyStates.map((s) => {
                        const nearbyMeta = getStateByFips(s.fips);
                        const nearbyHref = nearbyMeta ? (qs ? `${base}/${nearbyMeta.abbr}?${qs}` : `${base}/${nearbyMeta.abbr}`) : null;
                        const row = (
                          <>
                            <span>{s.name}</span>
                            <span className="tabular-nums text-white/80">
                              {s.medianHouseholdIncome != null ? formatUsd(s.medianHouseholdIncome) : "—"}
                            </span>
                          </>
                        );
                        return (
                          <li key={s.fips}>
                            {nearbyHref ? (
                              <Link
                                href={nearbyHref}
                                className="flex items-center justify-between text-[13px] text-white/60 transition-colors hover:text-white"
                              >
                                {row}
                              </Link>
                            ) : (
                              <div className="flex items-center justify-between text-[13px] text-white/60">{row}</div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {stateIncome && (
          <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="mb-3 text-[12px] text-white/45">{t.usStateMedianLabel}</p>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/40">
                  {formatTemplate(t.usAcs1YearLabel, { year: stateIncome.latest1Year?.year ?? acs1Vintage })}
                </span>
                <span className="text-[16px] font-bold tabular-nums text-white">
                  {stateIncome.latest1Year?.medianHouseholdIncome ? formatUsd(stateIncome.latest1Year.medianHouseholdIncome) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/40">{formatTemplate(t.usAcs5YearLabel, { range: acs5YearRange })}</span>
                <span className="text-[16px] font-bold tabular-nums text-white">
                  {stateIncome.medianHouseholdIncome ? formatUsd(stateIncome.medianHouseholdIncome) : "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        {geo.features.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-white/50">
            {t.usCountyNoDataDesc}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <UsMap geo={geo} fit onSelect={handleSelect} getFill={getFill} getLabel={getLabel} height={520} zoomable />
                <p className="mt-2 text-center text-[11px] text-white/35 sm:hidden">{t.usZoomHint}</p>
              </div>

              <div className="w-full shrink-0 sm:w-64">
                <p className="mb-0.5 text-[13px] font-bold text-white/90">
                  {formatTemplate(t.usStateCountyListHeadingTemplate, { state: state.name })}
                </p>
                <p className="mb-2 text-[11px] text-white/40">{t.usStateCountyListHint}</p>
                <UsGeoList
                  items={countyItems}
                  onSelect={handleSelect}
                  searchPlaceholder={t.usSearchCountyPlaceholder}
                  emptyText={t.usListNoResults}
                  maxHeight={460}
                />
              </div>
            </div>
            <IncomeLegend min={min} max={max} />
          </div>
        )}

        <div className="mt-8">{countyListAdSlot}</div>

        <div className="mt-8">
          <CompactInsightSection presetState={state} presetCounty={null} />
        </div>

        <div className="mt-2 rounded-lg bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[12px] text-white/40">{formatTemplate(t.usSourceCensus, { range: acs5YearRange })}</p>
          <p className="mt-1 text-[12px] text-white/30">{t.usDisclaimer}</p>
        </div>

        <Footer />
      </div>
    </UsShell>
  );
}

export default function UsStateClient(props: {
  state: StateMeta;
  geo: FeatureCollection<Geometry, UsMapFeatureProps>;
  counties: UsCountyIncome[];
  countyListAdSlot?: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <UsShell>
          <div className="flex min-h-screen items-center justify-center">
            <Spinner className="h-8 w-8 border-[3px] border-white/20 border-t-[#34D399]" />
          </div>
        </UsShell>
      }
    >
      <UsStateContent {...props} />
    </Suspense>
  );
}
