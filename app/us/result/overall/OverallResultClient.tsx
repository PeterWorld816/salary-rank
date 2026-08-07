"use client";
import { Suspense, useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import { formatTemplate } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";
import { getNationalIncomePercentile, getCountyIncome, nationalMedianHouseholdIncome, acs5YearRange } from "@/lib/usIncomeCalc";
import { decodeFriendChallenge } from "@/lib/usInput";
import UsShell from "@/components/us/UsShell";
import UsInputPanel from "@/components/us/UsInputPanel";
import Spinner from "@/components/Spinner";
import { useResultLocation } from "@/components/us/result/useResultLocation";
import { StepHeader, NextStepButton } from "@/components/us/result/StepChrome";
import { NoDataCard, StatRow } from "@/components/us/result/ResultBits";

function OverallResultContent({ adSlot }: { adSlot?: React.ReactNode }) {
  const { t } = useLanguage();
  const base = useLocaleBase();
  const loc = useResultLocation();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // This step only ever needs `input.annualIncome` — "your income vs. the
  // entire US" doesn't depend on a state/county pick, so it renders with or
  // without one (`loc.ready` only gates the title/back-link/next-step below).
  const { input, qs, from } = loc;
  const nationalPercentile = getNationalIncomePercentile(input.annualIncome);

  const friendChallenge = decodeFriendChallenge(from ?? "");
  const friendCounty = friendChallenge ? getCountyIncome(friendChallenge.countyFips) : null;
  const friendPlaceName = friendChallenge ? friendCounty?.name ?? friendChallenge.stateAbbr.toUpperCase() : null;
  const friendOutEarnsPercent = friendChallenge ? Math.max(1, Math.min(99, 100 - friendChallenge.percentile)) : null;

  return (
    <UsShell>
      <UsInputPanel collapsible />
      <div className="mx-auto max-w-md px-6 pb-16 pt-10">
        {friendChallenge && friendPlaceName && friendOutEarnsPercent != null && !bannerDismissed && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-4 py-3">
            <p className="text-[13px] leading-snug text-white/85">
              {formatTemplate(t.usFriendBannerTemplate, { percent: friendOutEarnsPercent, place: friendPlaceName })}
            </p>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label={t.usDismiss}
              className="shrink-0 rounded-full p-1 text-white/40 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <StepHeader
          step="overall"
          title={loc.ready ? `${loc.county.name}, ${loc.state.name}` : t.usAppTitle}
          intro={t.usResultOverallIntro}
          backHref={
            loc.ready
              ? qs
                ? `${base}/${loc.state.abbr}?${qs}`
                : `${base}/${loc.state.abbr}`
              : qs
                ? `${base}?${qs}`
                : base
          }
          backLabel={loc.ready ? t.usBackToStateMap : t.usBackToUsMap}
          qs={qs}
        />

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          {nationalPercentile == null ? (
            <NoDataCard title={t.usCountyNoDataTitle} desc={t.usCountyNoDataDesc} />
          ) : (
            <>
              <p className="mb-1 text-[12px] font-bold text-[#34D399]">{t.usNationalPercentileHeroLabel}</p>
              <p className="font-extrabold text-[#FBBF24]" style={{ fontSize: "56px", lineHeight: 1 }}>
                {nationalPercentile}%
              </p>
              <div className="mt-4 divide-y divide-white/[0.06] border-t border-white/10 pt-1 text-left">
                <StatRow label={t.usFieldIncome} value={formatUsd(input.annualIncome)} />
                {nationalMedianHouseholdIncome != null && (
                  <StatRow
                    label={t.usNationalMedianLabel}
                    sub={formatTemplate(t.usAcs5YearLabel, { range: acs5YearRange })}
                    value={formatUsd(nationalMedianHouseholdIncome)}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {adSlot}

        {loc.ready ? (
          <NextStepButton href={`${base}/result/state?${qs}`} />
        ) : (
          <NextStepButton href={qs ? `${base}?${qs}` : base} label={t.usResultMissingLocationCta} />
        )}
      </div>
    </UsShell>
  );
}

export default function OverallResultClient({ adSlot }: { adSlot?: React.ReactNode }) {
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
      <OverallResultContent adSlot={adSlot} />
    </Suspense>
  );
}
