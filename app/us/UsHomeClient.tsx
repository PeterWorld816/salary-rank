"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FeatureCollection, Geometry } from "geojson";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
import UsShell from "@/components/us/UsShell";
import UsInputPanel from "@/components/us/UsInputPanel";
import UsMap, { type UsMapFeatureProps } from "@/components/us/UsMap";
import UsGeoList from "@/components/us/UsGeoList";
import IncomeLegend from "@/components/us/IncomeLegend";
import Spinner from "@/components/Spinner";
import { US_STATES, getStateByFips } from "@/data/us/stateMeta";
import { getStateIncome, getAllStateIncomes, acs5YearRange } from "@/lib/usIncomeCalc";
import { incomeFill } from "@/components/us/colorScale";
import { formatUsd } from "@/lib/usFormat";

function UsHomeContent({ geo }: { geo: FeatureCollection<Geometry, UsMapFeatureProps> }) {
  const { t } = useLanguage();
  const router = useRouter();
  const sp = useSearchParams();
  const qs = sp.toString();
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const values = getAllStateIncomes()
    .map((s) => s.medianHouseholdIncome)
    .filter((v): v is number => v != null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

  function getHref(fips: string) {
    const state = getStateByFips(fips);
    if (!state) return "/us";
    return qs ? `/us/${state.abbr}?${qs}` : `/us/${state.abbr}`;
  }

  function getLabel(fips: string) {
    const state = getStateByFips(fips);
    if (!state) return "";
    const income = getStateIncome(fips);
    return income?.medianHouseholdIncome
      ? `${state.name} — $${income.medianHouseholdIncome.toLocaleString("en-US")}`
      : state.name;
  }

  function getFill(fips: string) {
    return incomeFill(getStateIncome(fips)?.medianHouseholdIncome ?? null, min, max);
  }

  // Single navigation entry point shared by both the map (Geography onClick)
  // and the search list (row onClick) — see step 4 of the mobile UX rework.
  function handleSelect(fips: string) {
    router.push(getHref(fips));
  }

  const stateItems = useMemo(
    () =>
      US_STATES.map((s) => {
        const income = getStateIncome(s.fips)?.medianHouseholdIncome;
        return { id: s.fips, name: s.name, sub: income ? formatUsd(income) : undefined };
      }),
    []
  );

  return (
    <UsShell>
      <UsInputPanel />

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="mb-2 text-[28px] font-extrabold tracking-tight text-balance">{t.usAppTitle}</h1>
        <p className="mb-8 max-w-xl text-[15px] text-white/55">{t.usTagline}</p>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-white/90">{t.usMapTitle}</h2>
          <span className="hidden text-[12px] text-white/40 md:inline">{t.usMapHint}</span>
        </div>

        {/* Desktop (md+): map stays put, search + full state list sits beside it. */}
        <div className="hidden gap-6 md:flex md:items-start">
          <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-4">
            <UsMap geo={geo} onSelect={handleSelect} getFill={getFill} getLabel={getLabel} height={480} />
            <IncomeLegend min={min} max={max} />
          </div>
          <div className="w-72 flex-shrink-0">
            <UsGeoList
              items={stateItems}
              onSelect={handleSelect}
              searchPlaceholder={t.usSearchStatePlaceholder}
              emptyText={t.usListNoResults}
              maxHeight={480}
            />
          </div>
        </div>

        {/* Mobile (<md): list-first, map is an opt-in zoomable toggle view — see
            requirement 3, small NE states are unreachable by touch otherwise. */}
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
              <UsMap geo={geo} onSelect={handleSelect} getFill={getFill} getLabel={getLabel} height={420} zoomable />
              <p className="mt-2 text-center text-[11px] text-white/35">{t.usZoomHint}</p>
              <IncomeLegend min={min} max={max} />
            </div>
          ) : (
            <UsGeoList
              items={stateItems}
              onSelect={handleSelect}
              searchPlaceholder={t.usSearchStatePlaceholder}
              emptyText={t.usListNoResults}
              maxHeight={420}
            />
          )}
        </div>

        <div className="mt-10 rounded-lg bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[12px] text-white/40">{formatTemplate(t.usSourceCensus, { range: acs5YearRange })}</p>
          <p className="mt-1 text-[12px] text-white/30">{t.usDisclaimer}</p>
          <p className="mt-1 text-[12px] text-white/25">🔒 {t.privacyNotice}</p>
        </div>
      </div>
    </UsShell>
  );
}

export default function UsHomeClient({ geo }: { geo: FeatureCollection<Geometry, UsMapFeatureProps> }) {
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
      <UsHomeContent geo={geo} />
    </Suspense>
  );
}
