// US income/net worth/401k percentile lookups for the /us section — reuses
// the same generic log-log percentile interpolation as lib/salaryCalc.ts and
// lib/netWorthCalc.ts (lib/percentileTable.ts), just fed by Census-derived
// anchor tables (USD) instead of the Korean statistics ones.
import stateIncomeData from "@/data/us/stateIncome.json";
import countyIncomeData from "@/data/us/countyIncome.json";
import nationalIncomeData from "@/data/us/nationalIncome.json";
import netWorthPercentilesUS from "@/data/us/netWorthPercentilesUS.json";
import k401Data from "@/data/us/401kByAge.json";
import { getPercentileRankFromTable, clampDisplayPercent, type PercentileAnchor } from "@/lib/percentileTable";
import type { UsAgeBandId } from "@/lib/usInput";

export type UsStateIncome = {
  fips: string;
  name: string;
  medianHouseholdIncome: number | null;
  percentileAnchors: PercentileAnchor[];
};

export type UsCountyIncome = {
  fips: string;
  stateFips: string;
  name: string;
  medianHouseholdIncome: number | null;
  percentileAnchors: PercentileAnchor[];
};

const stateByFips = new Map<string, UsStateIncome>((stateIncomeData.states as UsStateIncome[]).map((s) => [s.fips, s]));
const countyByFips = new Map<string, UsCountyIncome>(
  (countyIncomeData.counties as UsCountyIncome[]).map((c) => [c.fips, c])
);

export function getStateIncome(stateFips: string): UsStateIncome | null {
  return stateByFips.get(stateFips) ?? null;
}

export function getAllStateIncomes(): UsStateIncome[] {
  return stateIncomeData.states as UsStateIncome[];
}

export function getCountyIncome(countyFips: string): UsCountyIncome | null {
  return countyByFips.get(countyFips) ?? null;
}

export function getCountiesForState(stateFips: string): UsCountyIncome[] {
  return (countyIncomeData.counties as UsCountyIncome[]).filter((c) => c.stateFips === stateFips);
}

// null = no data yet (data/us/countyIncome.json still a placeholder, or this
// county's ACS sample was too small to compute a distribution) — callers
// must render a "data not loaded yet" state rather than a 0%/100% guess.
export function getCountyIncomePercentile(countyFips: string, annualIncome: number): number | null {
  const county = getCountyIncome(countyFips);
  if (!county || county.percentileAnchors.length < 2) return null;
  return clampDisplayPercent(getPercentileRankFromTable(county.percentileAnchors, annualIncome));
}

export function getNationalIncomePercentile(annualIncome: number): number | null {
  const anchors = nationalIncomeData.percentileAnchors as PercentileAnchor[];
  if (anchors.length < 2) return null;
  return clampDisplayPercent(getPercentileRankFromTable(anchors, annualIncome));
}

export const nationalMedianHouseholdIncome = nationalIncomeData.medianHouseholdIncome as number | null;

// Net worth has no per-state/county breakdown (the Fed's Survey of Consumer
// Finances is only reliable at the national level) — always compared
// against the whole US, and the UI must say so explicitly per the spec.
export function getUsNetWorthPercentile(netWorth: number): number {
  const anchors = netWorthPercentilesUS.percentileAnchors as PercentileAnchor[];
  return clampDisplayPercent(getPercentileRankFromTable(anchors, netWorth));
}

export const overallUsNetWorth = netWorthPercentilesUS.overall;

export type K401Comparison = {
  average: number;
  median: number;
  vsAveragePercent: number; // user's balance as a % of the age band's average
  vsMedianPercent: number;
};

// 401k data is only average + median per age band (no full distribution), so
// this is an honest ratio comparison rather than a fabricated percentile.
export function getK401Comparison(ageBand: UsAgeBandId, balance: number): K401Comparison {
  const entry = k401Data.bands.find((b) => b.id === ageBand) ?? k401Data.allParticipants;
  return {
    average: entry.average,
    median: entry.median,
    vsAveragePercent: Math.round((balance / entry.average) * 100),
    vsMedianPercent: Math.round((balance / entry.median) * 100),
  };
}
