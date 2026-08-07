"use client";
import { Suspense, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import { formatTemplate } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";
import { US_AGE_BANDS, US_GENDERS, US_MARITAL_STATUSES, encodeFriendChallenge } from "@/lib/usInput";
import { getTier } from "@/lib/tier";
import {
  getCountyIncomePercentile,
  getNationalIncomePercentile,
  getNationalIncomePercentileForAgeBand,
  getUsNetWorthPercentile,
  getUsNetWorthPercentileForAgeBand,
  overallUsNetWorth,
  getK401Comparison,
  getCountyGenderIncomeReference,
  getCountyMaritalIncomeReference,
} from "@/lib/usIncomeCalc";
import UsShell from "@/components/us/UsShell";
import Footer from "@/components/us/Footer";
import UsInputPanel from "@/components/us/UsInputPanel";
import TierBadge from "@/components/us/TierBadge";
import UsResultCard, { CARD_WIDTH, CARD_HEIGHT } from "@/components/us/UsResultCard";
import DistributionChart from "@/components/DistributionChart";
import ShareButtons from "@/components/ShareButtons";
import Spinner from "@/components/Spinner";
import Link from "next/link";
import { useResultLocation } from "@/components/us/result/useResultLocation";
import { StepHeader, MissingLocationFallback } from "@/components/us/result/StepChrome";
import { HeroStat, StatRow, NoDataCard } from "@/components/us/result/ResultBits";

function DemographicResultContent({ adSlot }: { adSlot?: React.ReactNode }) {
  const { t, tr, lang } = useLanguage();
  const base = useLocaleBase();
  const loc = useResultLocation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [compareToast, setCompareToast] = useState<string | null>(null);
  const [compareCopied, setCompareCopied] = useState(false);
  const [compareFallbackUrl, setCompareFallbackUrl] = useState<string | null>(null);

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
  const nationalPercentile = getNationalIncomePercentile(input.annualIncome);
  const heroPercent = countyPercentile ?? nationalPercentile;

  const ageBand = US_AGE_BANDS.find((b) => b.id === input.ageBand);
  const ageBandLabel = ageBand ? tr(ageBand.label) : input.ageBand;
  const genderLabel = tr(US_GENDERS.find((g) => g.id === input.gender)?.label ?? { ko: "", en: "" });
  const maritalLabel = tr(US_MARITAL_STATUSES.find((m) => m.id === input.maritalStatus)?.label ?? { ko: "", en: "" });

  const ageIncomePercentile = getNationalIncomePercentileForAgeBand(input.ageBand, input.annualIncome);
  // Both optional now (see lib/usInput.ts) — null means "not entered", not
  // "zero", so nothing downstream gets computed until the user fills them in
  // via the input panel's "more accurate result" section.
  const netWorthPercentile = input.netWorth != null ? getUsNetWorthPercentile(input.netWorth) : null;
  const ageNetWorthPercentile =
    input.netWorth != null ? getUsNetWorthPercentileForAgeBand(input.ageBand, input.netWorth) : null;
  const netWorthTier = netWorthPercentile != null ? getTier(netWorthPercentile) : null;
  const k401 = input.k401 != null ? getK401Comparison(input.ageBand, input.k401) : null;

  const genderIncomeRef = getCountyGenderIncomeReference(countyFips, input.gender);
  const maritalIncomeRef = getCountyMaritalIncomeReference(countyFips, input.maritalStatus);

  const shareTitle = `${t.usAppTitle} — ${county.name}, ${state.name}`;
  // "US earners" — deliberately the nationwide figure, not the county-scoped
  // `heroPercent`, per spec.
  const shareText =
    nationalPercentile != null
      ? formatTemplate(t.usShareTextTemplate, { percent: nationalPercentile })
      : `${county.name}, ${state.name}`;

  // Points the shared link at step 1 (not this page) so whoever opens it
  // gets the same three-step walkthrough from the start, not just this one
  // slice of the result.
  async function handleCompare() {
    if (heroPercent == null) return;
    const challenge = encodeFriendChallenge({ percentile: heroPercent, stateAbbr: state.abbr, countyFips });
    const params = new URLSearchParams(qs);
    params.set("from", challenge);
    const compareUrl = `${window.location.origin}${base}/result/overall?${params.toString()}`;

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(compareUrl);
      setCompareFallbackUrl(null);
      setCompareToast(t.copied);
      setCompareCopied(true);
      setTimeout(() => setCompareCopied(false), 2000);
    } catch {
      setCompareFallbackUrl(compareUrl);
      setCompareToast(t.shareFailed);
    } finally {
      setTimeout(() => setCompareToast(null), 2800);
    }
  }

  return (
    <UsShell>
      <UsInputPanel collapsible />
      <div className="mx-auto max-w-md px-6 pb-16 pt-10">
        <StepHeader
          step="demographic"
          title={`${county.name}, ${state.name}`}
          intro={t.usResultDemographicIntro}
          backHref={`${base}/result/state?${qs}`}
          backLabel={t.usResultPrevButton}
          qs={qs}
        />

        {/* ── Age-adjusted income + gender/marital reference ── */}
        <div className="mb-8">
          <div className="flex items-start justify-around gap-2">
            {ageIncomePercentile != null && (
              <HeroStat label={formatTemplate(t.usAgeIncomePercentileHeroLabel, { age: ageBandLabel })} percent={ageIncomePercentile} />
            )}
          </div>
          {(genderIncomeRef?.value != null || maritalIncomeRef?.value != null) && (
            <div className="mt-4 divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-white/[0.02] px-5 py-1">
              {genderIncomeRef?.value != null && (
                <StatRow
                  label={formatTemplate(t.usByGenderMedianLabelTemplate, { gender: genderLabel })}
                  sub={genderIncomeRef.usedFallback ? t.usRegionalDetailFallbackNote : undefined}
                  value={formatUsd(genderIncomeRef.value)}
                />
              )}
              {maritalIncomeRef?.value != null && (
                <StatRow
                  label={formatTemplate(t.usByMaritalMedianLabelTemplate, { status: maritalLabel })}
                  sub={maritalIncomeRef.usedFallback ? t.usRegionalDetailFallbackNote : undefined}
                  value={formatUsd(maritalIncomeRef.value)}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Net worth (nationwide only) ── */}
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-white/90">{t.usNetWorthSectionTitle}</h2>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-white/50">
            {t.usNetWorthNationalBadge}
          </span>
        </div>
        <div className="mb-8">
          {netWorthPercentile == null || input.netWorth == null ? (
            <NoDataCard title={t.usNetWorthMissingTitle} desc={t.usNetWorthMissingDesc} />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-center gap-2">
                {netWorthTier && <TierBadge tier={netWorthTier} />}
                <span className="font-extrabold text-[#34D399]" style={{ fontSize: "20px" }}>
                  {netWorthPercentile}%
                </span>
              </div>
              <div className="flex items-start justify-around gap-2">
                <HeroStat label={t.usNetWorthHeroLabel} percent={netWorthPercentile} />
                {ageNetWorthPercentile != null && (
                  <HeroStat
                    label={formatTemplate(t.usAgeNetWorthPercentileHeroLabel, { age: ageBandLabel })}
                    percent={ageNetWorthPercentile}
                  />
                )}
              </div>
              <div className="mt-4 flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <DistributionChart
                  monthlySalary={input.netWorth}
                  width={260}
                  lang={lang}
                  dark
                  min={1000}
                  max={15000000}
                  averageValue={overallUsNetWorth.median}
                />
              </div>
            </>
          )}
        </div>

        {/* ── 401k comparison ── */}
        <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-[15px] font-bold text-white/90">{t.usK401SectionTitle}</h2>
          {k401 == null || input.k401 == null ? (
            <NoDataCard title={t.usK401MissingTitle} desc={t.usK401MissingDesc} />
          ) : (
            <>
              <p className="mb-3 text-[12px] text-white/40">{t.usK401Helper}</p>
              <div className="divide-y divide-white/[0.06]">
                <StatRow label={t.usFieldAgeBand} sub={ageBandLabel} value={formatUsd(input.k401)} />
                <StatRow
                  label={formatTemplate(t.usK401VsAverageTemplate, { percent: k401.vsAveragePercent })}
                  sub={`avg ${formatUsd(k401.average)}`}
                  value={`${k401.vsAveragePercent}%`}
                />
                <StatRow
                  label={formatTemplate(t.usK401VsMedianTemplate, { percent: k401.vsMedianPercent })}
                  sub={`median ${formatUsd(k401.median)}`}
                  value={`${k401.vsMedianPercent}%`}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Place-level teaser (scaffolding only, see /us/[state]/[county]/[place]) ── */}
        <div className="mb-8 rounded-xl border border-dashed border-white/15 px-5 py-4 text-center">
          <p className="text-[12px] text-white/40">{t.usPlaceComingSoon}</p>
        </div>

        {/* ── Sources ── */}
        <div className="mb-8 rounded-lg bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[12px] text-white/40">{t.usSourceCensus}</p>
          <p className="mt-1 text-[12px] text-white/40">{t.usSourceScf}</p>
          <p className="mt-1 text-[12px] text-white/40">{t.usSourceVanguard}</p>
          <p className="mt-2 text-[12px] text-white/25">{t.usDisclaimer}</p>
        </div>

        {/* ── Share card preview — kept mounted at all times (ShareButtons'
            "Save Image" reads cardRef straight off it). ── */}
        <div className="mb-6 flex justify-center">
          <div className="overflow-hidden rounded-3xl shadow-[0_12px_48px_rgba(0,0,0,0.5)]">
            <UsResultCard
              stateName={state.name}
              countyName={county.name}
              countyPercentile={countyPercentile}
              nationalPercentile={nationalPercentile}
              annualIncome={input.annualIncome}
              netWorthPercentile={netWorthPercentile}
              k401Balance={input.k401}
              k401VsMedianPercent={k401?.vsMedianPercent ?? null}
              ageBandLabel={ageBandLabel}
              ageIncomePercentile={ageIncomePercentile}
              ageNetWorthPercentile={ageNetWorthPercentile}
              cardRef={cardRef}
              lang={lang}
            />
          </div>
        </div>

        <div className="mb-3">
          <ShareButtons
            cardRef={cardRef}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            shareTitle={shareTitle}
            shareText={shareText}
            downloadName={`us-income-${state.abbr}-${countyFips}.png`}
          />
        </div>

        <div className="relative mb-6">
          {compareToast && (
            <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-5 py-3 text-[14px] font-semibold text-[#0D0D0D] shadow-lg">
              {compareToast}
            </div>
          )}
          <button
            type="button"
            onClick={handleCompare}
            disabled={heroPercent == null}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 py-3 text-[14px] font-semibold text-white/80 transition-colors hover:border-[#34D399] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Link2 className="h-4 w-4" />
            {compareCopied ? t.usCompareCopiedShort : t.usCompareButton}
          </button>
          {compareFallbackUrl && (
            <div className="mt-2 rounded-md border border-white/15 bg-white/[0.04] p-3">
              <p className="mb-2 text-[12px] text-white/60">{t.usCompareCopyFailedHelper}</p>
              <input
                type="text"
                readOnly
                value={compareFallbackUrl}
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-[12px] text-white outline-none focus:border-[#34D399]"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href={qs ? `${base}/${state.abbr}?${qs}` : `${base}/${state.abbr}`}
            className="rounded-md border border-white/15 py-3 text-center text-[14px] font-semibold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
          >
            {t.usBackToStateMap}
          </Link>
          <Link
            href={qs ? `${base}?${qs}` : base}
            className="rounded-md border border-white/15 py-3 text-center text-[14px] font-semibold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
          >
            {t.usBackToUsMap}
          </Link>
        </div>

        {/* Kept well clear of the result card / share / compare buttons
            above — an ad placed near those risks accidental taps, which
            AdSense treats as invalid click activity, not just bad UX. */}
        {adSlot}

        <Footer />
      </div>
    </UsShell>
  );
}

export default function DemographicResultClient({ adSlot }: { adSlot?: React.ReactNode }) {
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
      <DemographicResultContent adSlot={adSlot} />
    </Suspense>
  );
}
