"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { FeatureCollection, Geometry } from "geojson";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
import UsShell from "@/components/us/UsShell";
import UsInputPanel from "@/components/us/UsInputPanel";
import UsMap, { type UsMapFeatureProps } from "@/components/us/UsMap";
import Spinner from "@/components/Spinner";
import type { StateMeta } from "@/data/us/stateMeta";
import { getCountyIncome, getCountiesForState } from "@/lib/usIncomeCalc";
import { incomeFill } from "@/components/us/colorScale";

function UsStateContent({
  state, geo,
}: { state: StateMeta; geo: FeatureCollection<Geometry, UsMapFeatureProps> }) {
  const { t } = useLanguage();
  const sp = useSearchParams();
  const qs = sp.toString();

  const values = getCountiesForState(state.fips)
    .map((c) => c.medianHouseholdIncome)
    .filter((v): v is number => v != null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

  function getHref(fips: string) {
    return qs ? `/us/${state.abbr}/${fips}?${qs}` : `/us/${state.abbr}/${fips}`;
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

  return (
    <UsShell>
      <UsInputPanel />

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          href={qs ? `/us?${qs}` : "/us"}
          className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.usBackToUsMap}
        </Link>

        <h1 className="mb-2 text-[26px] font-extrabold tracking-tight text-balance">
          {formatTemplate(t.usStateMapTitleTemplate, { state: state.name })}
        </h1>
        <p className="mb-8 max-w-xl text-[15px] text-white/55">{t.usStateMapHint}</p>

        {geo.features.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-white/50">
            {t.usCountyNoDataDesc}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-4">
            <UsMap geo={geo} fit getHref={getHref} getFill={getFill} getLabel={getLabel} height={520} />
          </div>
        )}

        <div className="mt-10 rounded-lg bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[12px] text-white/40">{t.usSourceCensus}</p>
          <p className="mt-1 text-[12px] text-white/30">{t.usDisclaimer}</p>
        </div>
      </div>
    </UsShell>
  );
}

export default function UsStateClient(props: {
  state: StateMeta;
  geo: FeatureCollection<Geometry, UsMapFeatureProps>;
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
