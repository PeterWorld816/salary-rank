"use client";
// Single-page result dashboard — replaces the old three-step overall/state/
// demographic flow (see git history for OverallResultClient/StateResultClient/
// DemographicResultClient). Every percentile those three steps used to
// compute one-at-a-time is computed here up front and shown together.
//
// Layout is a "one glance" card stack: headline -> mini stat grid -> share
// card -> compare chart, with the city picker collapsed into a header chip
// and the distribution charts tucked behind a "show details" toggle, so the
// common path (see your rank, share it) needs far less scrolling than the
// old always-expanded section-per-metric layout.
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Link2, X, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import { formatTemplate } from "@/lib/i18n";
import { formatUsd, stripStateSuffix } from "@/lib/usFormat";
import { US_AGE_BANDS, US_GENDERS, US_MARITAL_STATUSES, decodeFriendChallenge, encodeFriendChallenge } from "@/lib/usInput";
import { getTier } from "@/lib/tier";
import {
  getCountyIncome,
  getCountyIncomePercentile,
  getPlaceIncomePercentile,
  getPlacesForCounty,
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
import { useResultLocation, buildPlaceResultQuery } from "@/components/us/result/useResultLocation";
import { NoDataCard, StatRow, MiniStatCard } from "@/components/us/result/ResultBits";
import { CompareBarChart, type CompareBarItem } from "@/components/us/result/CompareBarChart";
import CityPickerChip from "@/components/us/result/CityPickerChip";

type Metric = { key: string; percent: number };
type GridCard = { key: string; label: string; displayValue: string; fillPercent: number; sub?: string; highlight: boolean };

function DashboardResultContent({ adSlot }: { adSlot?: React.ReactNode }) {
  const { t, tr, lang } = useLanguage();
  const base = useLocaleBase();
  const router = useRouter();
  const loc = useResultLocation();
  const cardRef = useRef<HTMLDivElement>(null);
  const storyCardRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [compareToast, setCompareToast] = useState<string | null>(null);
  const [compareCopied, setCompareCopied] = useState(false);
  const [compareFallbackUrl, setCompareFallbackUrl] = useState<string | null>(null);
  const [headlineFlash, setHeadlineFlash] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { input, qs, from } = loc;
  const ready = loc.ready;
  const state = ready ? loc.state : null;
  const county = ready ? loc.county : null;
  const countyFips = ready ? loc.countyFips : null;
  const place = ready ? loc.place : null;

  // ── Inline city picker — lets a visitor add a place-level percentile to
  // this dashboard without leaving it (the county SEO page's PlaceSearchList
  // does the same lookup, but navigates instead since it's server-rendered). ──
  const placeItems = useMemo(() => {
    if (!countyFips || !state) return [];
    return getPlacesForCounty(countyFips)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({
        id: p.fips,
        name: stripStateSuffix(p.name, state.name),
        sub: p.medianHouseholdIncome != null ? formatUsd(p.medianHouseholdIncome) : undefined,
      }));
  }, [countyFips, state]);

  function handleSelectPlace(placeFips: string) {
    if (!state || !countyFips) return;
    const query = buildPlaceResultQuery(new URLSearchParams(qs), state.abbr, countyFips, placeFips);
    router.replace(`${base}/result?${query}`, { scroll: false });
  }

  // ── Every percentile the old 3-step flow computed, all at once ──
  const nationalPercentile = getNationalIncomePercentile(input.annualIncome);
  const statePercentile = state ? getStateIncomePercentile(state.fips, input.annualIncome) : null;
  const countyPercentile = countyFips ? getCountyIncomePercentile(countyFips, input.annualIncome) : null;
  const placePercentile = place ? getPlaceIncomePercentile(place.fips, input.annualIncome) : null;
  const ageIncomePercentile = getNationalIncomePercentileForAgeBand(input.ageBand, input.annualIncome);
  const netWorthPercentile = input.netWorth != null ? getUsNetWorthPercentile(input.netWorth) : null;
  const ageNetWorthPercentile =
    input.netWorth != null ? getUsNetWorthPercentileForAgeBand(input.ageBand, input.netWorth) : null;
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

  // ── Mini stat grid — every metric above, as one compact card each
  // (label + percent + ring gauge) instead of a section per metric. Fill
  // direction is always "how full = how good": percentile cards fill by
  // (100 - percent) since a lower top-X% is better; the 401k cards fill by
  // the ratio itself, where a higher number is better. ──
  const gridCards: GridCard[] = [
    placePercentile != null && {
      key: "place",
      label: t.usPlacePercentileHeroLabel,
      displayValue: formatTemplate(t.topPercentTemplate, { percent: placePercentile }),
      fillPercent: 100 - placePercentile,
      sub: place?.medianHouseholdIncome != null ? formatUsd(place.medianHouseholdIncome) : undefined,
      highlight: best?.key === "place",
    },
    countyPercentile != null && {
      key: "county",
      label: t.usCountyPercentileHeroLabel,
      displayValue: formatTemplate(t.topPercentTemplate, { percent: countyPercentile }),
      fillPercent: 100 - countyPercentile,
      sub: county?.medianHouseholdIncome != null ? formatUsd(county.medianHouseholdIncome) : undefined,
      highlight: best?.key === "county",
    },
    statePercentile != null && {
      key: "state",
      label: t.usStatePercentileHeroLabel,
      displayValue: formatTemplate(t.topPercentTemplate, { percent: statePercentile }),
      fillPercent: 100 - statePercentile,
      highlight: best?.key === "state",
    },
    // "Top nationwide" (national-only percentile) is deliberately left out of
    // this grid — UsResultCard's share card already surfaces the nationwide
    // percent, so a mini box here would just repeat it. It stays in
    // `metrics`/`compareItems` below for the headline pick and compare chart.
    ageIncomePercentile != null && {
      key: "ageIncome",
      label: formatTemplate(t.usAgeIncomePercentileHeroLabel, { age: ageBandLabel }),
      displayValue: formatTemplate(t.topPercentTemplate, { percent: ageIncomePercentile }),
      fillPercent: 100 - ageIncomePercentile,
      highlight: best?.key === "ageIncome",
    },
    netWorthPercentile != null && {
      key: "netWorth",
      label: t.usNetWorthHeroLabel,
      displayValue: formatTemplate(t.topPercentTemplate, { percent: netWorthPercentile }),
      fillPercent: 100 - netWorthPercentile,
      sub: overallUsNetWorth.median != null ? formatUsd(overallUsNetWorth.median) : undefined,
      highlight: best?.key === "netWorth",
    },
    ageNetWorthPercentile != null && {
      key: "ageNetWorth",
      label: formatTemplate(t.usAgeNetWorthPercentileHeroLabel, { age: ageBandLabel }),
      displayValue: formatTemplate(t.topPercentTemplate, { percent: ageNetWorthPercentile }),
      fillPercent: 100 - ageNetWorthPercentile,
      highlight: best?.key === "ageNetWorth",
    },
    k401 != null && {
      key: "k401Average",
      label: formatTemplate(t.usK401VsAverageTemplate, { percent: k401.vsAveragePercent }),
      displayValue: `${k401.vsAveragePercent}%`,
      fillPercent: k401.vsAveragePercent,
      sub: `avg ${formatUsd(k401.average)}`,
      highlight: false,
    },
    k401 != null && {
      key: "k401Median",
      label: formatTemplate(t.usK401VsMedianTemplate, { percent: k401.vsMedianPercent }),
      displayValue: `${k401.vsMedianPercent}%`,
      fillPercent: k401.vsMedianPercent,
      sub: `median ${formatUsd(k401.median)}`,
      highlight: false,
    },
  ].filter((c): c is GridCard => Boolean(c));

  // ── Compare chart rows (percentile metrics only — 401k is a ratio, not a
  // percentile, so it gets its own cards instead) ──
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

  // ── Picking a city updates ?pl= (via handleSelectPlace) which flows back
  // through useResultLocation as a new `place`. That's easy to miss with no
  // page navigation, so flash the headline and scroll it into view the
  // moment the selection actually changes — skipped on first mount so
  // landing directly on a ?pl= URL doesn't flash immediately. ──
  const placeKey = place?.fips ?? null;
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setHeadlineFlash(true);
    headlineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setHeadlineFlash(false), 900);
    return () => clearTimeout(timer);
  }, [placeKey]);

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

  const hasNetWorthOrK401 = input.netWorth != null || input.k401 != null;

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

        {/* ── Header row: back link + compact city picker chip ── */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href={backHref} className="inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80">
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          {ready && state && county && placeItems.length > 0 && (
            <CityPickerChip
              label={place ? stripStateSuffix(place.name, state.name) : county.name}
              items={placeItems}
              onSelect={handleSelectPlace}
              searchPlaceholder={t.usSearchPlacePlaceholder}
              emptyText={t.usListNoResults}
              ariaLabel={t.usCityPickerAriaLabel}
            />
          )}
        </div>

        <h1 className="mb-2 text-[22px] font-extrabold tracking-tight text-balance">{title}</h1>
        <p className="mb-8 text-[13px] leading-relaxed text-white/50">{t.usResultDashboardIntro}</p>

        {/* ── Headline — flashes + scrolls into view when the city picker
            above changes the selection, so the update is felt without a
            page navigation to anchor it ── */}
        <div
          ref={headlineRef}
          className={`mb-8 rounded-2xl border p-6 text-center transition-shadow duration-700 ${
            headlineFlash ? "border-[#FBBF24]/50 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]" : "border-white/10"
          } bg-white/[0.03]`}
        >
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

        {/* ── Share card — moved above the mini stat grid so the shareable
            visual is the first thing seen after the headline. Share/Save +
            Compare stay below the grid, in their original position. ── */}
        {ready && state && county ? (
          <div className="mb-8">
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
          </div>
        ) : (
          <div className="mb-8">
            <NoDataCard title={t.usDashboardSharePromptTitle} desc={t.usDashboardSharePromptDesc} />
          </div>
        )}

        {/* ── Mini stat grid — every percentile/ratio metric as one compact
            card, 2 cols on mobile / 3 on wider screens ── */}
        {gridCards.length > 0 ? (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {gridCards.map((card) => (
              <MiniStatCard
                key={card.key}
                label={card.label}
                displayValue={card.displayValue}
                fillPercent={card.fillPercent}
                sub={card.sub}
                highlight={card.highlight}
              />
            ))}
          </div>
        ) : (
          <div className="mb-3">
            <NoDataCard title={t.usCountyNoDataTitle} desc={t.usCountyNoDataDesc} />
          </div>
        )}
        <div className="mb-8">
          {!hasNetWorthOrK401 && <p className="mt-2 text-[11px] text-white/30">{t.usDashboardAddMoreHint}</p>}
        </div>

        {/* ── Share/Save buttons + compare-with-a-friend ── */}
        {ready && state && county && (
          <div className="mb-10">
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
        )}

        {/* ── Compare-at-a-glance bar chart — the one big chart kept in this
            consolidated view ── */}
        {compareItems.length > 0 && (
          <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-4 text-[15px] font-bold text-white/90">{t.usDashboardCompareChartTitle}</h2>
            <CompareBarChart items={compareItems} />
          </div>
        )}

        {/* ── Details toggle — distribution curves + gender/marital
            reference rows, collapsed by default. These are supplementary,
            not part of the "one glance" summary above, and DistributionChart
            recomputes an SVG path on every render, so keeping it unmounted
            until asked for also avoids doing that work on every city pick. ── */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            aria-expanded={detailsOpen}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 py-2.5 text-[13px] font-semibold text-white/60 transition-colors hover:border-[#34D399] hover:text-white"
          >
            {detailsOpen ? t.usDetailsToggleHide : t.usDetailsToggleShow}
            <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
          </button>

          {detailsOpen && (
            <div className="mt-4 flex flex-col gap-4">
              {(genderIncomeRef?.value != null || maritalIncomeRef?.value != null) && (
                <div className="divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-white/[0.02] px-5 py-1">
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

              {(placePercentile != null || countyPercentile != null || statePercentile != null || nationalPercentile != null) && (
                <div className="flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="mb-3 self-start text-[12px] font-semibold text-white/50">{t.usDashboardIncomeSectionTitle}</p>
                  <DistributionChart
                    monthlySalary={input.annualIncome}
                    width={280}
                    lang={lang}
                    dark
                    min={15000}
                    max={500000}
                    averageValue={county?.medianHouseholdIncome ?? nationalMedianHouseholdIncome ?? 75000}
                  />
                  <p className="mt-2 text-[11px] text-white/30">{formatTemplate(t.usAcs5YearLabel, { range: acs5YearRange })}</p>
                </div>
              )}

              {netWorthPercentile != null && input.netWorth != null && (
                <div className="flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="mb-3 self-start text-[12px] font-semibold text-white/50">{t.usNetWorthSectionTitle}</p>
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
              )}
            </div>
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
