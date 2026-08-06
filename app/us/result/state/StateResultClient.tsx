"use client";
import { Suspense } from "react";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import { formatTemplate } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";
import {
  getCountyIncomePercentile,
  getStateIncomePercentile,
  nationalMedianHouseholdIncome,
  acs5YearRange,
} from "@/lib/usIncomeCalc";
import UsShell from "@/components/us/UsShell";
import UsInputPanel from "@/components/us/UsInputPanel";
import Spinner from "@/components/Spinner";
import DistributionChart from "@/components/DistributionChart";
import { useResultLocation } from "@/components/us/result/useResultLocation";
import { StepHeader, NextStepButton, MissingLocationFallback } from "@/components/us/result/StepChrome";
import { HeroStat, NoDataCard } from "@/components/us/result/ResultBits";

function StateResultContent() {
  const { t, lang } = useLanguage();
  const base = useLocaleBase();
  const loc = useResultLocation();

  if (!loc.ready) {
    return (
      <UsShell>
        <UsInputPanel collapsible />
        <div className="mx-auto max-w-md px-6 pb-16 pt-10">
          <MissingLocationFallback />
        </div>
      </UsShell>
    );
  }

  const { state, county, countyFips, input, qs } = loc;
  const countyPercentile = getCountyIncomePercentile(countyFips, input.annualIncome);
  const statePercentile = getStateIncomePercentile(state.fips, input.annualIncome);
  const bothMissing = countyPercentile == null && statePercentile == null;

  return (
    <UsShell>
      <UsInputPanel collapsible />
      <div className="mx-auto max-w-md px-6 pb-16 pt-10">
        <StepHeader
          step="state"
          title={`${county.name}, ${state.name}`}
          intro={t.usResultStateIntro}
          backHref={`${base}/result/overall?${qs}`}
          backLabel={t.usResultPrevButton}
          qs={qs}
        />

        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
          <p className="text-[12px] text-white/45">{t.usCountyMedianLabel}</p>
          <p className="text-[22px] font-bold tabular-nums text-white">
            {county.medianHouseholdIncome ? formatUsd(county.medianHouseholdIncome) : "—"}
          </p>
          <p className="mt-1 text-[11px] text-white/30">{formatTemplate(t.usAcs5YearLabel, { range: acs5YearRange })}</p>
        </div>

        {bothMissing ? (
          <NoDataCard title={t.usCountyNoDataTitle} desc={t.usCountyNoDataDesc} />
        ) : (
          <>
            <div className="flex items-start justify-around gap-2">
              {countyPercentile != null && <HeroStat label={t.usCountyPercentileHeroLabel} percent={countyPercentile} />}
              {statePercentile != null && <HeroStat label={t.usStatePercentileHeroLabel} percent={statePercentile} />}
            </div>
            <div className="mt-4 flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <DistributionChart
                monthlySalary={input.annualIncome}
                width={260}
                lang={lang}
                dark
                min={15000}
                max={500000}
                averageValue={county.medianHouseholdIncome ?? nationalMedianHouseholdIncome ?? 75000}
              />
            </div>
          </>
        )}

        <div className="mt-8">
          <NextStepButton href={`${base}/result/demographic?${qs}`} />
        </div>
      </div>
    </UsShell>
  );
}

export default function StateResultClient() {
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
      <StateResultContent />
    </Suspense>
  );
}
