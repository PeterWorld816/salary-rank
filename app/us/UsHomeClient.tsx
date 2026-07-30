"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { FeatureCollection, Geometry } from "geojson";
import { useLanguage } from "@/lib/LanguageProvider";
import UsShell from "@/components/us/UsShell";
import UsInputPanel from "@/components/us/UsInputPanel";
import UsMap, { type UsMapFeatureProps } from "@/components/us/UsMap";
import Spinner from "@/components/Spinner";
import { getStateByFips } from "@/data/us/stateMeta";
import { getStateIncome, getAllStateIncomes } from "@/lib/usIncomeCalc";
import { incomeFill } from "@/components/us/colorScale";

function UsHomeContent({ geo }: { geo: FeatureCollection<Geometry, UsMapFeatureProps> }) {
  const { t } = useLanguage();
  const sp = useSearchParams();
  const qs = sp.toString();

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

  return (
    <UsShell>
      <UsInputPanel />

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <Link href="/kr" className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80">
          <ChevronLeft className="h-4 w-4" />
          {t.koreaTabLabel}
        </Link>

        <h1 className="mb-2 text-[28px] font-extrabold tracking-tight text-balance">{t.usAppTitle}</h1>
        <p className="mb-8 max-w-xl text-[15px] text-white/55">{t.usTagline}</p>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-white/90">{t.usMapTitle}</h2>
          <span className="text-[12px] text-white/40">{t.usMapHint}</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-4">
          <UsMap geo={geo} getHref={getHref} getFill={getFill} getLabel={getLabel} height={480} />
        </div>

        <div className="mt-10 rounded-lg bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[12px] text-white/40">{t.usSourceCensus}</p>
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
