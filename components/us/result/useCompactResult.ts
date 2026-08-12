"use client";
// Shared calculation behind the two "compact" pieces of the state/county (and
// nationwide, on the home page) drill-down steps:
//  - CompactResultCard — the thin bell-curve card at the top of the page.
//  - CompactInsightSection — the coaching insight + percentile-gap card,
//    placed after the map/next-step section further down the page.
// Both call this hook independently (the county page's server component
// can't read searchParams itself — see that page's own top-of-file comment
// — so each client island needs its own Suspense boundary and its own call
// here; that's a deliberate tradeoff, not an oversight). What this hook
// actually buys is a single source of truth for the *logic*: both pieces
// are guaranteed to land on identical numbers for the same input, instead of
// two calculations that could quietly drift apart. Neither piece renders the
// input panel more than once — only CompactResultCard does that.
import { useMemo } from "react";
import { useLanguage } from "@/lib/LanguageProvider";
import { getTier, type Tier } from "@/lib/tier";
import {
  getStateIncome,
  getIncomePercentileFromAnchors,
  getNationalIncomePercentile,
  getNationalIncomePercentileForAgeBand,
  getUsNetWorthPercentile,
  getUsNetWorthPercentileForAgeBand,
  nationalMedianHouseholdIncome,
  type UsCountyIncome,
} from "@/lib/usIncomeCalc";
import type { PercentileAnchor } from "@/lib/percentileTable";
import { buildPercentileGapNote } from "@/lib/percentileGap";
import nationalIncomeData from "@/data/us/nationalIncome.json";
import netWorthPercentilesUS from "@/data/us/netWorthPercentilesUS.json";
import type { StateMeta } from "@/data/us/stateMeta";
import { useResultLocation } from "@/components/us/result/useResultLocation";
import { buildCoachingInsight, type CoachingInsight } from "@/lib/insightMessages";
import type { UsInput } from "@/lib/usInput";

export type CompactLevel = "national" | "state" | "county";

export type CompactResult =
  | {
      ready: true;
      level: CompactLevel;
      incomePercent: number;
      tier: Tier;
      netWorthPercentile: number | null;
      medianForChart: number;
      input: UsInput;
      coachingInsight: CoachingInsight;
      gapNote: string | null;
    }
  | { ready: false; input: UsInput };

// `presetState`/`presetCounty` mirror PersonalizedResult's own props — the
// route resolves them server-side (see each page's `resolve()`), so this
// hook never needs its own ?st=/?co= lookup, same reasoning as
// useResultLocation itself.
export function useCompactResult(presetState: StateMeta | null, presetCounty: UsCountyIncome | null): CompactResult {
  const { t, lang } = useLanguage();
  const loc = useResultLocation(presetState, presetCounty, null);
  const { input } = loc;

  const nationalAnchors = nationalIncomeData.percentileAnchors as PercentileAnchor[];
  const netWorthAnchors = netWorthPercentilesUS.percentileAnchors as PercentileAnchor[];

  const nationalPercentile = getNationalIncomePercentile(input.annualIncome);
  const stateIncome = presetState ? getStateIncome(presetState.fips) : null;
  const statePercentile = stateIncome ? getIncomePercentileFromAnchors(stateIncome.percentileAnchors, input.annualIncome) : null;
  const countyPercentile = presetCounty ? getIncomePercentileFromAnchors(presetCounty.percentileAnchors, input.annualIncome) : null;

  // Most-specific geography with a real result wins — same fallback order the
  // old compact variant used, and it happens to match the level each page
  // should show since only the county page passes presetCounty and only the
  // state/county pages pass presetState.
  let level: CompactLevel = "national";
  let incomePercent = nationalPercentile;
  let anchorsForGap: PercentileAnchor[] = nationalAnchors;
  let medianForChart = nationalMedianHouseholdIncome ?? 75000;

  if (presetCounty && countyPercentile != null) {
    level = "county";
    incomePercent = countyPercentile;
    anchorsForGap = presetCounty.percentileAnchors;
    medianForChart = presetCounty.medianHouseholdIncome ?? medianForChart;
  } else if (presetState && statePercentile != null && stateIncome) {
    level = "state";
    incomePercent = statePercentile;
    anchorsForGap = stateIncome.percentileAnchors;
    medianForChart = stateIncome.medianHouseholdIncome ?? medianForChart;
  }

  const netWorthPercentile = input.netWorth != null ? getUsNetWorthPercentile(input.netWorth) : null;
  const ageIncomePercentile = getNationalIncomePercentileForAgeBand(input.ageBand, input.annualIncome);
  const ageNetWorthPercentile = input.netWorth != null ? getUsNetWorthPercentileForAgeBand(input.ageBand, input.netWorth) : null;

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
    [lang, input.ageBand, input.annualIncome, input.netWorth, input.k401, ageIncomePercentile, nationalPercentile, ageNetWorthPercentile, netWorthPercentile]
  );

  // ── Percentile gap — "$X more and you'd reach the top Y%", from this
  // level's real anchors (income) plus, when the visitor gave a net worth,
  // the national net-worth anchors (the only table that exists for it) —
  // see lib/percentileGap.ts (shared with PersonalizedResult.tsx's "full"/
  // "standalone" variant so the two never drift apart). No place-relative
  // rescale here: none of the three compact levels (national/state/county)
  // ever involve a place. ──
  const gapNote = buildPercentileGapNote({
    t,
    incomeAnchors: anchorsForGap,
    annualIncome: input.annualIncome,
    netWorthAnchors,
    netWorth: input.netWorth,
  });

  if (incomePercent == null) return { ready: false, input };

  return {
    ready: true,
    level,
    incomePercent,
    tier: getTier(incomePercent),
    netWorthPercentile,
    medianForChart,
    input,
    coachingInsight,
    gapNote,
  };
}
