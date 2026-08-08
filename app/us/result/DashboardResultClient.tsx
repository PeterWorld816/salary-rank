"use client";
// Single-page result dashboard — replaces the old three-step overall/state/
// demographic flow (see git history for OverallResultClient/StateResultClient/
// DemographicResultClient). Every percentile those three steps used to
// compute one-at-a-time is computed here up front and shown together:
// scrolling replaces "next step" as the way to see more.
import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { Link2, X, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import { formatTemplate } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";
import { US_AGE_BANDS, US_GENDERS, US_MARITAL_STATUSES, decodeFriendChallenge, encodeFriendChallenge } from "@/lib/usInput";
import { getTier } from "@/lib/tier";
import {
  getCountyIncome,
  getCountyIncomePercentile,
  getPlaceIncomePercentile,
  getStateIncomePercentile,
  getNationalIncomePercentile,
  getNationalIncomePercentileForAgeBand,
  getUsNetWorthPercentile,
  getUsNetWorthPercentileForAgeBand,
  overallUsNetWorth,
  getK401Comparison,
  getCountyGenderIncomeReference,
  getCountyMaritalIncomeReference,
  nationalMedianHouseholdIncome,
  acs5YearRange,
} from "@/lib/usIncomeCalc";
import UsShell from "@/components/us/UsShell";
import Footer from "@/components/us/Footer";
import UsInputPanel from "@/components/us/UsInputPanel";
import TierBadge from "@/components/us/TierBadge";
import UsResultCard, { CARD_WIDTH, CARD_HEIGHT, STORY_WIDTH, STORY_HEIGHT } from "@/components/us/UsResultCard";
import DistributionChart from "@/components/DistributionChart";
import ShareButtons from "@/components/ShareButtons";
import Spinner from "@/components/Spinner";
import { useResultLocation } from "@/components/us/result/useResultLocation";
import { HeroStat, NoDataCard, StatRow } from "@/components/us/result/ResultBits";
import { CompareBarChart, type CompareBarItem } from "@/components/us/result/CompareBarChart";

type Metric = { key: string; percent: number };

function DashboardResultContent({ adSlot }: { adSlot?: React.ReactNode }) {
  const { t, tr, lang } = useLanguage();
  const base = useLocaleBase();
  const loc = useResultLocation();
  const cardRef = useRef<HTMLDivElement>(null);
  const storyCardRef = useRef<HTMLDivElement>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [compareToast, setCompareToast] = useState<string | null>(null);
  const [compareCopied, setCompareCopied] = useState(false);
  const [compareFallbackUrl, setCompareFallbackUrl] = useState<string | null>(null);

  const { input, qs, from } = loc;
  const ready = loc.ready;
  const state = ready ? loc.state : null;
  const county = ready ? loc.county : null;
  const countyFips = ready ? loc.countyFips : null;
  const place = ready ? loc.place : null;

  // ── Every percentile the old 3-step flow computed, all at once ──
  const nationalPercentile = getNationalIncomePercentile(input.annualIncome);
  const statePercentile = state ? getStateIncomePercentile(state.fips, input.annualIncome) : null;
  const countyPercentile = countyFips ? getCountyIncomePercentile(countyFips, input.annualIncome) : null;
  const placePercentile = place ? getPlaceIncomePercentile(place.fips, input.annualIncome) : null;
  const ageIncomePercentile = getNationalIncomePercentileForAgeBand(input.ageBand, input.annualIncome);
  const netWorthPercentile = input.netWorth != null ? getUsNetWorthPercentile(input.netWorth) : null;
  const ageNetWorthPercentile =
    input.netWorth != null ? getUsNetWorthPercentileForAgeBand(input.ageBand, input.netWorth) : null;
  const netWorthTier = netWorthPercentile != null ? getTier(netWorthPercentile) : null;
  const k401 = input.k401 != null ? getK401Comparison(input.ageBand, input.k401) : null;
  const genderIncomeRef = countyFips ? getCountyGenderIncomeReference(countyFips, input.gender) : null;
  const maritalIncomeRef = countyFips ? getCountyMaritalIncomeReference(countyFips, input.maritalStatus) : null;

  const heroPercent = placePercentile ?? countyPercentile ?? statePercentile ?? nationalPercentile;

  const ageBand = US_AGE_BANDS.find((b) => b.id === input.ageBand);
  const ageBandLabel = ageBand ? tr(ageBand.label) : input.ageBand;
  const genderLabel = tr(US_GENDERS.find((g) => g.id === input.gender)?.label ?? { ko: "", en: "" });
  const maritalLabel = tr(US_MARITAL_STATUSES.find((m) => m.id === input.maritalStatus)?.label ?? { ko: "", en: "" });

  // ── Auto-narrative headline: find the metric with the best (lowest "top
  // X%") standing and, if it beats the income baseline by 10+ points,
  // contrast the two; otherwise just call out the single best one. ──
  const shortLabels: Record<string, string> = {
    place: t.usDashboardPlaceIncomeLabel,
    county: t.usDashboardCountyIncomeLabel,
    state: t.usDashboardStateIncomeLabel,
    national: t.usDashboardNationalIncomeLabel,
    ageIncome: formatTemplate(t.usDashboardAgeIncomeLabelTemplate, { age: ageBandLabel }),
    netWorth: t.usDashboardNetWorthLabel,
    ageNetWorth: formatTemplate(t.usDashboardAgeNetWorthLabelTemplate, { age: ageBandLabel }),
  };
  const metrics: Metric[] = [
    placePercentile != null && { key: "place", percent: placePercentile },
    countyPercentile != null && { key: "county", percent: countyPercentile },
    statePercentile != null && { key: "state", percent: statePercentile },
    nationalPercentile != null && { key: "national", percent: nationalPercentile },
    ageIncomePercentile != null && { key: "ageIncome", percent: ageIncomePercentile },
    netWorthPercentile != null && { key: "netWorth", percent: netWorthPercentile },
    ageNetWorthPercentile != null && { key: "ageNetWorth", percent: ageNetWorthPercentile },
  ].filter((m): m is Metric => Boolean(m));

  // Place outranks county as the "income basis" reference when selected —
  // it's the most specific geography we have a number for.
  const incomeBaseline: Metric | null =
    placePercentile != null
      ? { key: "place", percent: placePercentile }
      : countyPercentile != null
        ? { key: "county", percent: countyPercentile }
        : statePercentile != null
          ? { key: "state", percent: statePercentile }
          : nationalPercentile != null
            ? { key: "national", percent: nationalPercentile }
            : null;

  const best = metrics.length > 0 ? metrics.reduce((a, b) => (b.percent < a.percent ? b : a)) : null;

  let headline: string | null = null;
  let headlineTierPercent: number | null = null;
  if (best) {
    headlineTierPercent = best.percent;
    if (incomeBaseline && best.key !== incomeBaseline.key && best.percent <= incomeBaseline.percent - 10) {
      headline = formatTemplate(t.usDashboardHeadlineComboTemplate, {
        baseLabel: shortLabels[incomeBaseline.key],
        basePercent: incomeBaseline.percent,
        bestLabel: shortLabels[best.key],
        bestPercent: best.percent,
      });
    } else {
      headline = formatTemplate(t.usDashboardHeadlineSingleTemplate, {
        bestLabel: shortLabels[best.key],
        bestPercent: best.percent,
      });
    }
  }
  const headlineTier = headlineTierPercent != null ? getTier(headlineTierPercent) : null;

  // ── Compare chart rows (percentile metrics only — 401k is a ratio, not a
  // percentile, so it gets its own card instead) ──
  const compareItems: CompareBarItem[] = [
    placePercentile != null && { key: "place", label: t.usPlacePercentileHeroLabel, percent: placePercentile, valueLabel: formatTemplate(t.topPercentTemplate, { percent: placePercentile }) },
    countyPercentile != null && { key: "county", label: t.usCountyPercentileHeroLabel, percent: countyPercentile, valueLabel: formatTemplate(t.topPercentTemplate, { percent: countyPercentile }) },
    statePercentile != null && { key: "state", label: t.usStatePercentileHeroLabel, percent: statePercentile, valueLabel: formatTemplate(t.topPercentTemplate, { percent: statePercentile }) },
    nationalPercentile != null && { key: "national", label: t.usNationalPercentileHeroLabel, percent: nationalPercentile, valueLabel: formatTemplate(t.topPercentTemplate, { percent: nationalPercentile }) },
    ageIncomePercentile != null && {
      key: "ageIncome",
      label: formatTemplate(t.usAgeIncomePercentileHeroLabel, { age: ageBandLabel }),
      percent: ageIncomePercentile,
      valueLabel: formatTemplate(t.topPercentTemplate, { percent: ageIncomePercentile }),
    },
    netWorthPercentile != null && { key: "netWorth", label: t.usNetWorthHeroLabel, percent: netWorthPercentile, valueLabel: formatTemplate(t.topPercentTemplate, { percent: netWorthPercentile }) },
    ageNetWorthPercentile != null && {
      key: "ageNetWorth",
      label: formatTemplate(t.usAgeNetWorthPercentileHeroLabel, { age: ageBandLabel }),
      percent: ageNetWorthPercentile,
      valueLabel: formatTemplate(t.topPercentTemplate, { percent: ageNetWorthPercentile }),
    },
  ].filter((m): m is CompareBarItem => Boolean(m));

  // ── Friend challenge banner (ported from the old overall step) ──
  const friendChallenge = decodeFriendChallenge(from ?? "");
  const friendCounty = friendChallenge ? getCountyIncome(friendChallenge.countyFips) : null;
  const friendPlaceName = friendChallenge ? friendCounty?.name ?? friendChallenge.stateAbbr.toUpperCase() : null;
  const friendOutEarnsPercent = friendChallenge ? Math.max(1, Math.min(99, 100 - friendChallenge.percentile)) : null;

  const title = ready && state && county ? (place ? place.name : `${county.name}, ${state.name}`) : t.usAppTitle;
  const backHref = ready && state ? (qs ? `${base}/${state.abbr}?${qs}` : `${base}/${state.abbr}`) : qs ? `${base}?${qs}` : base;
  const backLabel = ready ? t.usBackToStateMap : t.usBackToUsMap;

  const shareTitle = ready && state && county ? `${t.usAppTitle} — ${county.name}, ${state.name}` : t.usAppTitle;
  const shareText =
    nationalPercentile != null
      ? formatTemplate(t.usShareTextTemplate, { percent: nationalPercentile })
      : ready && state && county
        ? `${county.name}, ${state.name}`
        : t.usAppTitle;

  async function handleCompare() {
    if (!ready || !state || !countyFips || heroPercent == null) return;
    const challenge = encodeFriendChallenge({ percentile: heroPercent, stateAbbr: state.abbr, countyFips });
    const params = new URLSearchParams(qs);
    params.set("from", challenge);
    const compareUrl = `${window.location.origin}${base}/result?${params.toString()}`;

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
      <div className="mx-auto max-w-2xl px-6 pb-16 pt-10">
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

        <Link href={backHref} className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80">
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <h1 className="mb-2 text-[22px] font-extrabold tracking-tight text-balance">{title}</h1>
        <p className="mb-8 text-[13px] leading-relaxed text-white/50">{t.usResultDashboardIntro}</p>

        {/* ── Headline ── */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          {headline == null ? (
            <NoDataCard title={t.usCountyNoDataTitle} desc={t.usCountyNoDataDesc} />
          ) : (
            <>
              {headlineTier && (
                <div className="mb-3 flex justify-center">
                  <TierBadge tier={headlineTier} />
                </div>
              )}
              <p className="text-[20px] font-extrabold leading-snug text-balance text-white">{headline}</p>
            </>
          )}
        </div>

        {/* ── Share card + compare, moved up top ── */}
        {ready && state && county ? (
          <div className="mb-10">
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

            {/* Instagram/Snapchat Story-ratio (9:16) card — rasterized by
                "Save Story" below. Off-screen, not display:none, so
                html-to-image still lays it out. */}
            <div className="pointer-events-none absolute left-[-9999px] top-0 overflow-hidden" aria-hidden>
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
                cardRef={storyCardRef}
                lang={lang}
                variant="story"
              />
            </div>

            <div className="mb-3">
              <ShareButtons
                cardRef={cardRef}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                shareTitle={shareTitle}
                shareText={shareText}
                downloadName={`us-income-${state.abbr}-${countyFips}.png`}
                storyCardRef={storyCardRef}
                storyWidth={STORY_WIDTH}
                storyHeight={STORY_HEIGHT}
                storyDownloadName={`us-income-story-${state.abbr}-${countyFips}.png`}
              />
            </div>

            <div className="relative">
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
          </div>
        ) : (
          <div className="mb-10">
            <NoDataCard title={t.usDashboardSharePromptTitle} desc={t.usDashboardSharePromptDesc} />
          </div>
        )}

        {/* ── Compare-at-a-glance bar chart ── */}
        {compareItems.length > 0 && (
          <div className="mb-10 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-4 text-[15px] font-bold text-white/90">{t.usDashboardCompareChartTitle}</h2>
            <CompareBarChart items={compareItems} />
          </div>
        )}

        {/* ── Income breakdown ── */}
        <div className="mb-10">
          <h2 className="mb-3 text-[15px] font-bold text-white/90">{t.usDashboardIncomeSectionTitle}</h2>

          {place && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <p className="text-[12px] text-white/45">{t.usPlaceMedianLabel}</p>
              <p className="text-[20px] font-bold tabular-nums text-white">
                {place.medianHouseholdIncome ? formatUsd(place.medianHouseholdIncome) : "—"}
              </p>
              <p className="mt-1 text-[11px] text-white/30">{formatTemplate(t.usAcs5YearLabel, { range: acs5YearRange })}</p>
            </div>
          )}

          {ready && county && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <p className="text-[12px] text-white/45">{t.usCountyMedianLabel}</p>
              <p className="text-[20px] font-bold tabular-nums text-white">
                {county.medianHouseholdIncome ? formatUsd(county.medianHouseholdIncome) : "—"}
              </p>
              <p className="mt-1 text-[11px] text-white/30">{formatTemplate(t.usAcs5YearLabel, { range: acs5YearRange })}</p>
            </div>
          )}

          {placePercentile == null && countyPercentile == null && statePercentile == null && nationalPercentile == null ? (
            <NoDataCard title={t.usCountyNoDataTitle} desc={t.usCountyNoDataDesc} />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-around gap-4">
                {placePercentile != null && <HeroStat label={t.usPlacePercentileHeroLabel} percent={placePercentile} />}
                {countyPercentile != null && <HeroStat label={t.usCountyPercentileHeroLabel} percent={countyPercentile} />}
                {statePercentile != null && <HeroStat label={t.usStatePercentileHeroLabel} percent={statePercentile} />}
                {nationalPercentile != null && <HeroStat label={t.usNationalPercentileHeroLabel} percent={nationalPercentile} />}
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

              <div className="mt-4 flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <DistributionChart
                  monthlySalary={input.annualIncome}
                  width={280}
                  lang={lang}
                  dark
                  min={15000}
                  max={500000}
                  averageValue={county?.medianHouseholdIncome ?? nationalMedianHouseholdIncome ?? 75000}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Net worth (nationwide only) ── */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-white/90">{t.usNetWorthSectionTitle}</h2>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-white/50">
              {t.usNetWorthNationalBadge}
            </span>
          </div>
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
                  width={280}
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
        <div className="mb-10 rounded-xl border border-white/10 bg-white/[0.02] p-5">
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

        {/* ── Sources ── */}
        <div className="mb-8 rounded-lg bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[12px] text-white/40">{formatTemplate(t.usSourceCensus, { range: acs5YearRange })}</p>
          <p className="mt-1 text-[12px] text-white/40">{t.usSourceScf}</p>
          <p className="mt-1 text-[12px] text-white/40">{t.usSourceVanguard}</p>
          <p className="mt-2 text-[12px] text-white/25">{t.usDisclaimer}</p>
        </div>

        {ready && state && (
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
        )}

        {/* Kept well clear of the result card / share / compare buttons above
            — an ad placed near those risks accidental taps, which AdSense
            treats as invalid click activity, not just bad UX. */}
        <div className="mt-8">{adSlot}</div>

        <Footer />
      </div>
    </UsShell>
  );
}

export default function DashboardResultClient({ adSlot }: { adSlot?: React.ReactNode }) {
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
      <DashboardResultContent adSlot={adSlot} />
    </Suspense>
  );
}
