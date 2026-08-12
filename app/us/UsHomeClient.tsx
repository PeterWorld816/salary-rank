"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FeatureCollection, Geometry } from "geojson";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import { formatTemplate } from "@/lib/i18n";
import UsShell from "@/components/us/UsShell";
import UsMap, { type UsMapFeatureProps } from "@/components/us/UsMap";
import UsGeoList from "@/components/us/UsGeoList";
import IncomeLegend from "@/components/us/IncomeLegend";
import Footer from "@/components/us/Footer";
import Spinner from "@/components/Spinner";
import CompactResultCard from "@/components/us/result/CompactResultCard";
import CompactInsightSection from "@/components/us/result/CompactInsightSection";
import { getStateByFips } from "@/data/us/stateMeta";
import { getStateIncome, getAllStateIncomes, acs5YearRange } from "@/lib/usIncomeCalc";
import { incomeFill } from "@/components/us/colorScale";
import { formatUsd } from "@/lib/usFormat";

function UsHomeContent({ geo }: { geo: FeatureCollection<Geometry, UsMapFeatureProps> }) {
  const { t } = useLanguage();
  const router = useRouter();
  const sp = useSearchParams();
  const qs = sp.toString();
  const base = useLocaleBase();

  const values = getAllStateIncomes()
    .map((s) => s.medianHouseholdIncome)
    .filter((v): v is number => v != null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

  function getHref(fips: string) {
    const state = getStateByFips(fips);
    if (!state) return base;
    return qs ? `${base}/${state.abbr}?${qs}` : `${base}/${state.abbr}`;
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

  function handleSelect(fips: string) {
    router.push(getHref(fips));
  }

  const stateItems = geo.features
    .map((f) => {
      const fips = String(f.id);
      const state = getStateByFips(fips);
      if (!state) return null;
      const income = getStateIncome(fips)?.medianHouseholdIncome;
      return { id: fips, name: state.name, sub: income != null ? formatUsd(income) : undefined };
    })
    .filter((s): s is { id: string; name: string; sub: string | undefined } => s != null);

  return (
    <UsShell>
      <CompactResultCard presetState={null} presetCounty={null} />

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="mb-2 text-[28px] font-extrabold tracking-tight text-balance">{t.usAppTitle}</h1>
        <p className="mb-8 max-w-xl text-[15px] text-white/55">{t.usTagline}</p>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-white/90">{t.usMapTitle}</h2>
          <span className="text-[12px] text-white/40">{t.usMapHint}</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <UsMap geo={geo} onSelect={handleSelect} getFill={getFill} getLabel={getLabel} height={480} zoomable />
              <p className="mt-2 text-center text-[11px] text-white/35 sm:hidden">{t.usZoomHint}</p>
            </div>

            <div className="w-full shrink-0 sm:w-64">
              <UsGeoList
                items={stateItems}
                onSelect={handleSelect}
                searchPlaceholder={t.usSearchStatePlaceholder}
                emptyText={t.usListNoResults}
                maxHeight={480}
              />
            </div>
          </div>
          <IncomeLegend min={min} max={max} />
        </div>

        <div className="mt-8">
          <CompactInsightSection presetState={null} presetCounty={null} />
        </div>

        <div className="mt-2 rounded-lg bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[12px] text-white/40">{formatTemplate(t.usSourceCensus, { range: acs5YearRange })}</p>
          <p className="mt-1 text-[12px] text-white/30">{t.usDisclaimer}</p>
          <p className="mt-1 text-[12px] text-white/25">🔒 {t.privacyNotice}</p>
        </div>

        <Footer />
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
