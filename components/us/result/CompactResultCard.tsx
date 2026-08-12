"use client";
// Thin, horizontal bell-curve card — the step-2 slot shared by the home page
// (nationwide), /us/[state] (state), and /us/[state]/[county] (county): a
// "Top X%" number on the left, a small DistributionChart (with its "You're
// here!" marker) on the right, one row. Deliberately not the big centered
// square card the old "compact" PersonalizedResult variant used — this is
// meant to stay out of the way of the map/next-step section right below it.
// See useCompactResult.ts for the shared calculation and
// CompactInsightSection.tsx for the coaching-insight card that goes after
// that map section.
import { Suspense } from "react";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
import DistributionChart from "@/components/DistributionChart";
import TierBadge from "@/components/us/TierBadge";
import UsInputPanel from "@/components/us/UsInputPanel";
import { NoDataCard } from "@/components/us/result/ResultBits";
import Spinner from "@/components/Spinner";
import type { StateMeta } from "@/data/us/stateMeta";
import type { UsCountyIncome } from "@/lib/usIncomeCalc";
import { useCompactResult, type CompactLevel } from "@/components/us/result/useCompactResult";
import type { Translations } from "@/lib/i18n";

const LEVEL_LABEL_KEY: Record<CompactLevel, keyof Translations> = {
  national: "usNationalPercentileHeroLabel",
  state: "usStatePercentileHeroLabel",
  county: "usCountyPercentileHeroLabel",
};

// Small enough to keep the card thin and wide rather than tall — see
// lib/distributionPath.ts's CHART_VIEWBOX_H=150; at width=200 the chart
// itself renders at ~94px tall, +22px for its absolute-positioned labels.
const CHART_WIDTH = 200;

function CompactResultCardInner({
  presetState,
  presetCounty,
}: {
  presetState: StateMeta | null;
  presetCounty: UsCountyIncome | null;
}) {
  const { t, lang } = useLanguage();
  const result = useCompactResult(presetState, presetCounty);

  return (
    <>
      <UsInputPanel />
      <div className="mx-auto max-w-2xl px-6 pt-8">
        {result.ready ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 sm:flex-nowrap">
            <div className="flex min-w-0 flex-col items-start gap-1">
              <TierBadge tier={result.tier} />
              <div className="text-[32px] font-extrabold leading-none tracking-tight text-[#FBBF24]">
                {formatTemplate(t.topPercentTemplate, { percent: result.incomePercent })}
              </div>
              <p className="text-[12px] font-semibold text-white/60">{t[LEVEL_LABEL_KEY[result.level]]}</p>
            </div>
            <div className="shrink-0">
              <DistributionChart
                monthlySalary={result.input.annualIncome}
                width={CHART_WIDTH}
                lang={lang}
                dark
                min={15000}
                max={500000}
                averageValue={result.medianForChart}
              />
            </div>
          </div>
        ) : (
          <NoDataCard title={t.usCountyNoDataTitle} desc={t.usCountyNoDataDesc} />
        )}
      </div>
    </>
  );
}

export default function CompactResultCard(props: { presetState: StateMeta | null; presetCounty: UsCountyIncome | null }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-8">
          <Spinner className="h-6 w-6 border-[3px] border-white/20 border-t-[#34D399]" />
        </div>
      }
    >
      <CompactResultCardInner {...props} />
    </Suspense>
  );
}
