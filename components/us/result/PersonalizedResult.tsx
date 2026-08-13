"use client";
// The personalized percentile dashboard — bell-curve-first: headline (top-X%
// + the percent as one big number) then the income DistributionChart with
// its "you're here" marker, always visible. Everything else (share card,
// mini stat grid, compare chart, gender/marital reference rows, net-worth
// curve) is supplementary and lives behind the "See full breakdown" toggle
// or, for the share card, behind actually clicking Share/Save.
//
// Rendered in two variants:
//  - "standalone" (default) at /us/result — the nationwide-only fallback for
//    visitors who skip the map entirely. Owns its own UsShell/back-link/h1/
//    sources footer/bottom nav/Footer.
//  - "full" at the top of /us/[state]/[county]/[place] — the whole bell-curve
//    dashboard, since the town is where the drill-down ends.
// Both resolve state/county/place from route params server-side (see each
// route's `resolve()`) and pass them in as presets so this component never
// needs its own ?st=/?co=/?pl=; the parent page already supplies UsShell,
// the page's one <h1>, the sources footer, and Footer, so "full" trims that
// out and renders just the personalized cards.
//
// The home/state/county steps (/us, /us/[state], /us/[state]/[county]) use a
// different, thinner pair of components instead — CompactResultCard.tsx
// (bell curve) and CompactInsightSection.tsx (coaching insight), sharing
// their calculation via useCompactResult.ts — since neither page is the end
// of the drill-down and both need the bell curve and insight card at
// different points around their own map/next-step section, not bundled
// together the way this component's "full" dashboard is.
import { Suspense, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Link2, X, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import { formatTemplate } from "@/lib/i18n";
import { formatUsd, formatPeopleCount, stripStateSuffix } from "@/lib/usFormat";
import { US_AGE_BANDS, US_GENDERS, US_MARITAL_STATUSES, decodeFriendChallenge, buildCompareInviteHref } from "@/lib/usInput";
import { getTier } from "@/lib/tier";
import { getCountyName } from "@/lib/usCountyNames";
import type { StateMeta } from "@/data/us/stateMeta";
import {
  getIncomePercentileFromAnchors,
  getPlaceIncomePercentileFromCounty,
  resolveIncomeReference,
  getStateIncome,
  getStateIncomePercentile,
  getNationalIncomePercentile,
  getNationalIncomePercentileForAgeBand,
  getUsNetWorthPercentile,
  getUsNetWorthPercentileForAgeBand,
  overallUsNetWorth,
  getK401Comparison,
  nationalMedianHouseholdIncome,
  acs5YearRange,
  type UsCountyIncome,
  type UsPlaceIncome,
} from "@/lib/usIncomeCalc";
import { estimateBandPopulation, type PercentileAnchor } from "@/lib/percentileTable";
import { buildPercentileGapNote } from "@/lib/percentileGap";
import { useCountUp } from "@/lib/useCountUp";
import { US_TOTAL_HOUSEHOLDS_2024 } from "@/lib/usPopulation";
import nationalIncomeData from "@/data/us/nationalIncome.json";
import netWorthPercentilesUS from "@/data/us/netWorthPercentilesUS.json";
import UsShell from "@/components/us/UsShell";
import Footer from "@/components/us/Footer";
import UsInputPanel from "@/components/us/UsInputPanel";
import TierBadge from "@/components/us/TierBadge";
import UsShareCardWide, { WIDE_WIDTH, WIDE_HEIGHT } from "@/components/us/UsShareCardWide";
import UsShareCardStory, { STORY_WIDTH, STORY_HEIGHT } from "@/components/us/UsShareCardStory";
import DistributionChart from "@/components/DistributionChart";
import ShareButtons from "@/components/ShareButtons";
import Spinner from "@/components/Spinner";
import { useResultLocation, buildPlaceHref } from "@/components/us/result/useResultLocation";
import { NoDataCard, StatRow, MiniStatCard } from "@/components/us/result/ResultBits";
import { CompareBarChart, type CompareBarItem } from "@/components/us/result/CompareBarChart";
import CityPickerChip from "@/components/us/result/CityPickerChip";
import CoachingInsightCard from "@/components/us/result/CoachingInsightCard";
import { buildCoachingInsight } from "@/lib/insightMessages";

type Metric = { key: string; percent: number };
type GridCard = { key: string; label: string; displayValue: string; fillPercent: number; sub?: string; highlight: boolean };

type Variant = "standalone" | "full";

function PersonalizedResultContent({
  adSlot,
  presetState,
  presetCounty,
  presetPlace,
  presetPlacesForCounty,
  variant,
}: {
  adSlot?: React.ReactNode;
  presetState: StateMeta | null;
  presetCounty: UsCountyIncome | null;
  presetPlace: UsPlaceIncome | null;
  presetPlacesForCounty: UsPlaceIncome[];
  variant: Variant;
}) {
  const { t, tr, lang } = useLanguage();
  const base = useLocaleBase();
  const router = useRouter();
  const loc = useResultLocation(presetState, presetCounty, presetPlace);
  const cardRef = useRef<HTMLDivElement>(null);
  const storyCardRef = useRef<HTMLDivElement>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [compareToast, setCompareToast] = useState<string | null>(null);
  const [compareCopied, setCompareCopied] = useState(false);
  const [compareFallbackUrl, setCompareFallbackUrl] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // The share card preview stays off-screen (not display:none, so
  // html-to-image can still capture it) until Share/Save is actually
  // clicked — see the "Share card" block below.
  const [shareCardVisible, setShareCardVisible] = useState(false);

  const { input, qs, from } = loc;
  const ready = loc.ready;
  const state = ready ? loc.state : null;
  const county = ready ? loc.county : null;
  const countyFips = ready ? loc.countyFips : null;
  const place = ready ? loc.place : null;

  // ── Inline city picker — jumps straight to a sibling place's own page
  // (/us/[state]/[county]/[place]) carrying today's answers along, rather
  // than patching a ?pl= param in place — every place gets its own
  // crawlable/shareable URL now, so there's no "same page, new place" state
  // left to patch. ──
  const placeItems = useMemo(() => {
    if (!countyFips || !state) return [];
    return presetPlacesForCounty
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({
        id: p.fips,
        name: stripStateSuffix(p.name, state.name),
        sub: p.medianHouseholdIncome != null ? formatUsd(p.medianHouseholdIncome) : undefined,
      }));
  }, [countyFips, state, presetPlacesForCounty]);

  function handleSelectPlace(placeFips: string) {
    if (!state || !countyFips) return;
    router.push(buildPlaceHref(base, new URLSearchParams(qs), state.abbr, countyFips, placeFips));
  }

  // ── Every percentile the old 3-step flow computed, all at once ──
  const nationalPercentile = getNationalIncomePercentile(input.annualIncome);
  const statePercentile = state ? getStateIncomePercentile(state.fips, input.annualIncome) : null;
  const countyPercentile = county ? getIncomePercentileFromAnchors(county.percentileAnchors, input.annualIncome) : null;
  const placePercentile =
    place && county
      ? getPlaceIncomePercentileFromCounty(county.medianHouseholdIncome, county.percentileAnchors, place.medianHouseholdIncome, input.annualIncome)
      : null;
  const ageIncomePercentile = getNationalIncomePercentileForAgeBand(input.ageBand, input.annualIncome);
  const netWorthPercentile = input.netWorth != null ? getUsNetWorthPercentile(input.netWorth) : null;

  // `embedded` distinguishes "full" from "standalone" through the rest of
  // this component, same as the former true/false embedded prop.
  const embedded = variant === "full";

  const ageNetWorthPercentile =
    input.netWorth != null ? getUsNetWorthPercentileForAgeBand(input.ageBand, input.netWorth) : null;
  const k401 = input.k401 != null ? getK401Comparison(input.ageBand, input.k401) : null;
  const genderIncomeRef = county ? resolveIncomeReference(county.byGender[input.gender], county.medianHouseholdIncome) : null;
  const maritalIncomeRef = county
    ? resolveIncomeReference(county.byMaritalStatus[input.maritalStatus], county.medianHouseholdIncome)
    : null;

  // ── Coaching insight — age/situation-aware narrative (see
  // lib/insightMessages.ts for the full decision logic and cited sources).
  // Prefers the age-band-relative percentile over the flat national one so
  // the message reflects "vs. people your age", not just "vs. everyone". ──
  const coachingInsight = useMemo(
    () =>
      buildCoachingInsight({
        lang,
        ageBand: input.ageBand,
        annualIncome: input.annualIncome,
        netWorth: input.netWorth,
        k401: input.k401,
        incomePercentile: ageIncomePercentile ?? nationalPercentile,
        netWorthPercentile: ageNetWorthPercentile ?? netWorthPercentile,
      }),
    [
      lang,
      input.ageBand,
      input.annualIncome,
      input.netWorth,
      input.k401,
      ageIncomePercentile,
      nationalPercentile,
      ageNetWorthPercentile,
      netWorthPercentile,
    ]
  );

  const heroPercent = placePercentile ?? countyPercentile ?? statePercentile ?? nationalPercentile;

  // ── Percentile gap — "$X more and you'd reach the top Y%", read straight
  // off whichever geography's real percentileAnchors is most specific (place
  // has no anchors of its own — see getPlaceIncomePercentileFromCounty above
  // — so a place result borrows its county's curve). When a place *is*
  // selected, `incomeScale` re-centers the gap the same way placePercentile
  // itself does (countyMedian/placeMedian, via getPercentileRankRelativeTo)
  // so the gap note and the headline percentile stay consistent instead of
  // silently comparing two different baselines. Net worth only ever has the
  // national anchors (no state/county breakdown — see lib/usIncomeCalc.ts). ──
  const stateIncomeForGap = state ? getStateIncome(state.fips) : null;
  const anchorsForGap: PercentileAnchor[] =
    county && county.percentileAnchors.length >= 2
      ? county.percentileAnchors
      : stateIncomeForGap && stateIncomeForGap.percentileAnchors.length >= 2
        ? stateIncomeForGap.percentileAnchors
        : (nationalIncomeData.percentileAnchors as PercentileAnchor[]);
  const incomeScale =
    place && county?.medianHouseholdIncome != null && place.medianHouseholdIncome != null && place.medianHouseholdIncome > 0
      ? county.medianHouseholdIncome / place.medianHouseholdIncome
      : 1;
  const gapNote = useMemo(
    () =>
      buildPercentileGapNote({
        t,
        incomeAnchors: anchorsForGap,
        annualIncome: input.annualIncome,
        incomeScale,
        netWorthAnchors: netWorthPercentilesUS.percentileAnchors as PercentileAnchor[],
        netWorth: input.netWorth,
      }),
    [t, anchorsForGap, input.annualIncome, incomeScale, input.netWorth]
  );

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

  // ── The "reveal" flourishes — a brief count-up instead of the number just
  // appearing, plus a real "how many people are near you" line right under
  // it. Both keyed off the same headlineTierPercent/annualIncome the number
  // itself already shows, no separate computation path. ──
  const animatedHeadlinePercent = useCountUp(headlineTierPercent);
  const similarIncomePopulation =
    headlineTierPercent != null
      ? estimateBandPopulation(nationalIncomeData.percentileAnchors as PercentileAnchor[], input.annualIncome, US_TOTAL_HOUSEHOLDS_2024)
      : null;

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
    // this grid — the share cards (UsShareCardWide/UsShareCardStory) already
    // surface the nationwide percent, so a mini box here would just repeat
    // it. It stays in
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
  const friendCountyName = friendChallenge ? getCountyName(friendChallenge.countyFips) : null;
  const friendPlaceName = friendChallenge ? friendCountyName ?? friendChallenge.stateAbbr.toUpperCase() : null;
  const friendOutEarnsPercent = friendChallenge ? Math.max(1, Math.min(99, 100 - friendChallenge.percentile)) : null;

  // The most specific place name we have — the town's own (stripped of its
  // redundant ", {state}" suffix — see lib/usFormat.ts) when one is
  // selected/preset, else the county's, same stripping. Both
  // countyIncome.json and placeIncome.json names already end in ", {state}",
  // so appending state.name again below without stripping first is what
  // produced "Bent County, Colorado, Colorado".
  const locationName =
    ready && state
      ? place
        ? stripStateSuffix(place.name, state.name)
        : county
          ? stripStateSuffix(county.name, state.name)
          : null
      : null;

  const title = ready && state && locationName ? `${locationName}, ${state.name}` : t.usAppTitle;
  const backHref = ready && state ? (qs ? `${base}/${state.abbr}?${qs}` : `${base}/${state.abbr}`) : qs ? `${base}?${qs}` : base;
  const backLabel = ready ? t.usBackToStateMap : t.usBackToUsMap;

  const shareTitle = ready && state && locationName ? `${t.usAppTitle} — ${locationName}, ${state.name}` : t.usAppTitle;
  const shareText =
    nationalPercentile != null
      ? formatTemplate(t.usShareTextTemplate, { percent: nationalPercentile })
      : ready && state && locationName
        ? `${locationName}, ${state.name}`
        : t.usAppTitle;

  // ── "Compare with a friend" — genuinely different from Share/Save above:
  // this builds a dedicated /compare/[inviteId] invite link (see
  // buildCompareInviteHref, lib/usInput.ts) carrying this person's full
  // answer set, not just a link back to this same page. Whoever opens it
  // fills in their own info and gets an actual side-by-side comparison
  // screen, not a "you beat X%" banner. ──
  async function handleCompare() {
    if (!ready || !state || !countyFips) return;
    const href = buildCompareInviteHref(base, input, lang, state.abbr, countyFips, place?.fips ?? null);
    const compareUrl = `${window.location.origin}${href}`;

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

  const content = (
    <div className={embedded ? "mx-auto max-w-2xl px-6 pb-6 pt-10" : "mx-auto max-w-2xl px-6 pb-16 pt-10"}>
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

      {/* ── Header row: back link (standalone only — embedded pages already
          have their own back link above the page's <h1>) + compact city
          picker chip ── */}
      <div className={`mb-6 flex items-center gap-3 ${embedded ? "justify-end" : "justify-between"}`}>
        {!embedded && (
          <Link href={backHref} className="inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80">
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        )}
        {ready && state && placeItems.length > 0 && (
          <CityPickerChip
            label={place ? stripStateSuffix(place.name, state.name) : stripStateSuffix(county?.name ?? "", state.name)}
            items={placeItems}
            onSelect={handleSelectPlace}
            searchPlaceholder={t.usSearchPlacePlaceholder}
            emptyText={t.usListNoResults}
            ariaLabel={t.usCityPickerAriaLabel}
          />
        )}
      </div>

      {!embedded && (
        <>
          <h1 className="mb-2 text-[22px] font-extrabold tracking-tight text-balance">{title}</h1>
          <p className="mb-8 text-[13px] leading-relaxed text-white/50">{t.usResultDashboardIntro}</p>
        </>
      )}

      {/* ── Headline: "top X%" + the percent as one big number, count-up
          animated, plus a real "how many people are near you" line — the
          actual "reveal" moment this page builds to, so the share buttons
          right below stay reachable without scrolling past the chart/
          insight card first (see the moved block right after this one). ── */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        {headline == null || headlineTierPercent == null ? (
          <NoDataCard title={t.usCountyNoDataTitle} desc={t.usCountyNoDataDesc} />
        ) : (
          <>
            {headlineTier && (
              <div className="mb-3 flex justify-center">
                <TierBadge tier={headlineTier} />
              </div>
            )}
            <div className="text-[56px] font-extrabold leading-none tracking-tight text-[#FBBF24]">
              {formatTemplate(t.topPercentTemplate, { percent: animatedHeadlinePercent ?? 0 })}
            </div>
            <p className="mt-3 text-[15px] font-semibold leading-snug text-balance text-white/80">{headline}</p>
            {similarIncomePopulation != null && (
              <p className="mt-3 text-[12px] leading-relaxed text-white/45">
                {formatTemplate(t.usSimilarIncomePopulationTemplate, { count: formatPeopleCount(similarIncomePopulation, lang) })}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Share card — off-screen (not display:none, so html-to-image can
          still capture it) until Share/Save/Save Story is actually clicked,
          at which point it swaps into view as a preview of what was just
          shared/saved. Moved up here, right under the headline (rather than
          after the bell curve/insight card below), so the percentile and a
          way to act on it both land above the fold. ── */}
      {ready && state && locationName && (
        <div
          className={
            shareCardVisible
              ? "mb-6 flex justify-center"
              : "pointer-events-none absolute left-[-9999px] top-0 overflow-hidden"
          }
          aria-hidden={!shareCardVisible}
        >
          <div className={shareCardVisible ? "overflow-hidden rounded-3xl shadow-[0_12px_48px_rgba(0,0,0,0.5)]" : ""}>
            <UsShareCardWide
              stateName={state.name}
              locationName={locationName}
              countyPercentile={countyPercentile}
              nationalPercentile={nationalPercentile}
              annualIncome={input.annualIncome}
              netWorthPercentile={netWorthPercentile}
              ageBandLabel={ageBandLabel}
              ageIncomePercentile={ageIncomePercentile}
              ageNetWorthPercentile={ageNetWorthPercentile}
              cardRef={cardRef}
              lang={lang}
            />
          </div>
        </div>
      )}

      {/* Instagram/Snapchat Story-ratio (9:16) card — rasterized by "Save
          Story" only, never shown on-screen itself (the card above is the
          user-facing preview). Off-screen, not display:none, so
          html-to-image still lays it out. */}
      {ready && state && locationName && (
        <div className="pointer-events-none absolute left-[-9999px] top-0 overflow-hidden" aria-hidden>
          <UsShareCardStory
            stateName={state.name}
            locationName={locationName}
            countyPercentile={countyPercentile}
            nationalPercentile={nationalPercentile}
            annualIncome={input.annualIncome}
            netWorthPercentile={netWorthPercentile}
            ageBandLabel={ageBandLabel}
            ageIncomePercentile={ageIncomePercentile}
            ageNetWorthPercentile={ageNetWorthPercentile}
            cardRef={storyCardRef}
            lang={lang}
          />
        </div>
      )}

      {/* ── Share/Save buttons + compare-with-a-friend ── */}
      {ready && state && county ? (
        <div className="mb-10" onClickCapture={() => setShareCardVisible(true)}>
          <div className="mb-3">
            <ShareButtons
              cardRef={cardRef}
              width={WIDE_WIDTH}
              height={WIDE_HEIGHT}
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

      {/* ── Bell curve — the one chart always on screen (besides the
          headline above). Everything else (mini stat grid, compare chart,
          gender/marital reference rows, net-worth curve) lives behind "See
          full breakdown" below. ── */}
      {(placePercentile != null || countyPercentile != null || statePercentile != null || nationalPercentile != null) && (
        <div className="mb-8 flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.02] p-5">
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

      {/* ── Coaching insight — always shown (national income percentile is
          effectively always available), placed right after the bell curve
          so it reads as the follow-up takeaway once the headline/share
          moment above has landed. ── */}
      <CoachingInsightCard insight={coachingInsight} title={t.usCoachingInsightTitle} gapNote={gapNote} />

      {/* ── See full breakdown — mini stat grid, compare chart,
          gender/marital reference rows, net-worth curve. Everything that
          made the default view busy now lives here, collapsed by default
          (also keeps the extra DistributionChart unmounted, and its SVG
          path uncomputed, until asked for). ── */}
      <div className={embedded ? "" : "mb-8"}>
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
            {gridCards.length > 0 && (
              <div>
                <div className="grid grid-cols-3 gap-2">
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
                {!hasNetWorthOrK401 && <p className="mt-2 text-[11px] text-white/30">{t.usDashboardAddMoreHint}</p>}
              </div>
            )}

            {compareItems.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <h2 className="mb-4 text-[15px] font-bold text-white/90">{t.usDashboardCompareChartTitle}</h2>
                <CompareBarChart items={compareItems} />
              </div>
            )}

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

      {/* Kept well clear of the result card / share / compare buttons above
          — an ad placed near those risks accidental taps, which AdSense
          treats as invalid click activity, not just bad UX. Rendered for
          "full" (embedded, the place page) too, unlike the rest of this
          block below: the place page has nowhere else to put its own ad, so
          it passes one in via the adSlot prop same as standalone does. */}
      {embedded && adSlot && <div className="mt-8">{adSlot}</div>}

      {!embedded && (
        <>
          <div className="mb-8 mt-8 rounded-lg bg-white/[0.03] px-4 py-3 text-center">
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

          <div className="mt-8">{adSlot}</div>

          <Footer />
        </>
      )}
    </div>
  );

  if (embedded)
    return (
      <>
        <UsInputPanel />
        {content}
      </>
    );

  return (
    <UsShell>
      <UsInputPanel />
      {content}
    </UsShell>
  );
}

export default function PersonalizedResult({
  adSlot,
  presetState = null,
  presetCounty = null,
  presetPlace = null,
  presetPlacesForCounty = [],
  variant = "standalone",
}: {
  adSlot?: React.ReactNode;
  presetState?: StateMeta | null;
  presetCounty?: UsCountyIncome | null;
  presetPlace?: UsPlaceIncome | null;
  // The county's sibling places, for the inline city picker — resolved
  // server-side (see app/us/[state]/[county]/[place]/page.tsx) since the
  // full places-per-county dataset is server-only (lib/usCountyPlaceData.ts).
  // Only "full" actually renders the picker; other variants can omit this.
  presetPlacesForCounty?: UsPlaceIncome[];
  variant?: Variant;
}) {
  return (
    <Suspense
      fallback={
        variant === "standalone" ? (
          <UsShell>
            <div className="flex min-h-screen items-center justify-center">
              <Spinner className="h-8 w-8 border-[3px] border-white/20 border-t-[#34D399]" />
            </div>
          </UsShell>
        ) : (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-6 w-6 border-[3px] border-white/20 border-t-[#34D399]" />
          </div>
        )
      }
    >
      <PersonalizedResultContent
        adSlot={adSlot}
        presetState={presetState}
        presetCounty={presetCounty}
        presetPlace={presetPlace}
        presetPlacesForCounty={presetPlacesForCounty}
        variant={variant}
      />
    </Suspense>
  );
}
