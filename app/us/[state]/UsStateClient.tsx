"use client";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { FeatureCollection, Geometry } from "geojson";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import { formatTemplate } from "@/lib/i18n";
import UsShell from "@/components/us/UsShell";
import UsInputPanel from "@/components/us/UsInputPanel";
import UsMap, { type UsMapFeatureProps } from "@/components/us/UsMap";
import UsGeoList from "@/components/us/UsGeoList";
import IncomeLegend from "@/components/us/IncomeLegend";
import Footer from "@/components/us/Footer";
import Spinner from "@/components/Spinner";
import type { StateMeta } from "@/data/us/stateMeta";
import {
  getCountyIncome,
  getCountiesForState,
  getStateIncome,
  getNationalIncomePercentile,
  acs5YearRange,
  acs1Vintage,
} from "@/lib/usIncomeCalc";
import { getValueAtPercentile } from "@/lib/percentileTable";
import { buildResultQuery } from "@/components/us/result/useResultLocation";
import { incomeFill } from "@/components/us/colorScale";
import { formatUsd, stripStateSuffix } from "@/lib/usFormat";
import { PercentileThresholds } from "@/components/us/PercentileThresholds";

function UsStateContent({
  state, geo, countyListAdSlot,
}: { state: StateMeta; geo: FeatureCollection<Geometry, UsMapFeatureProps>; countyListAdSlot?: React.ReactNode }) {
  const { t } = useLanguage();
  const router = useRouter();
  const sp = useSearchParams();
  const qs = sp.toString();
  const base = useLocaleBase();
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const values = getCountiesForState(state.fips)
    .map((c) => c.medianHouseholdIncome)
    .filter((v): v is number => v != null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

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

  const countyDirectory = getCountiesForState(state.fips)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  // Picking a county starts the 3-step result flow at its first step, not
  // the old single-page result — see app/us/result/**.
  function getHref(fips: string) {
    return `${base}/result/overall?${buildResultQuery(sp, state.abbr, fips)}`;
  }

  function getLabel(fips: string) {
    const feature = geo.features.find((f) => String(f.id) === fips);
    const name = feature?.properties?.name ?? fips;
    const income = getCountyIncome(fips);
    return income?.medianHouseholdIncome ? `${name} — $${income.medianHouseholdIncome.toLocaleString("en-US")}` : name;
  }

  function getFill(fips: string) {
    return incomeFill(getCountyIncome(fips)?.medianHouseholdIncome ?? null, min, max);
  }

  // Single navigation entry point shared by both the map (Geography onClick)
  // and the search list (row onClick) — see step 4 of the mobile UX rework.
  function handleSelect(fips: string) {
    router.push(getHref(fips));
  }

  const countyItems = useMemo(
    () =>
      geo.features.map((f) => {
        const fips = String(f.id);
        const income = getCountyIncome(fips)?.medianHouseholdIncome;
        return { id: fips, name: f.properties?.name ?? fips, sub: income ? formatUsd(income) : undefined };
      }),
    [geo]
  );

  return (
    <UsShell>
      <UsInputPanel />

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
          <>
            {/* Desktop (md+): map stays put, search + full county list sits beside it. */}
            <div className="hidden gap-6 md:flex md:items-start">
              <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-4">
                <UsMap geo={geo} fit onSelect={handleSelect} getFill={getFill} getLabel={getLabel} height={520} />
                <IncomeLegend min={min} max={max} />
              </div>
              <div className="w-72 flex-shrink-0">
                <UsGeoList
                  items={countyItems}
                  onSelect={handleSelect}
                  searchPlaceholder={t.usSearchCountyPlaceholder}
                  emptyText={t.usListNoResults}
                  maxHeight={520}
                />
              </div>
            </div>

            {/* Mobile (<md): list-first, map is an opt-in zoomable toggle view. */}
            <div className="md:hidden">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMobileView((v) => (v === "map" ? "list" : "map"))}
                  className="rounded-md border border-white/15 px-3 py-1.5 text-[13px] font-semibold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
                >
                  {mobileView === "map" ? t.usViewList : t.usViewMap}
                </button>
              </div>
              {mobileView === "map" ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2">
                  <UsMap geo={geo} fit onSelect={handleSelect} getFill={getFill} getLabel={getLabel} height={420} zoomable />
                  <p className="mt-2 text-center text-[11px] text-white/35">{t.usZoomHint}</p>
                  <IncomeLegend min={min} max={max} />
                </div>
              ) : (
                <UsGeoList
                  items={countyItems}
                  onSelect={handleSelect}
                  searchPlaceholder={t.usSearchCountyPlaceholder}
                  emptyText={t.usListNoResults}
                  maxHeight={420}
                />
              )}
            </div>
          </>
        )}

        {/* Crawlable directory of every county in the state — plain internal
            links to each /us/[state]/[county] content page, independent of
            the map/search widget above. */}
        {countyDirectory.length > 0 && (
          <div className="mt-10">
            {countyListAdSlot}
            <h2 className="mb-1 text-[18px] font-bold text-white/90">
              {formatTemplate(t.usStateCountyListHeadingTemplate, { state: state.name })}
            </h2>
            <p className="mb-4 text-[13px] text-white/45">{t.usStateCountyListHint}</p>
            <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {countyDirectory.map((c) => (
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

        <div className="mt-10 rounded-lg bg-white/[0.03] px-4 py-3 text-center">
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
