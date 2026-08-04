// US income/net worth/401k percentile lookups for the /us section — reuses
// the same generic log-log percentile interpolation as lib/salaryCalc.ts and
// lib/netWorthCalc.ts (lib/percentileTable.ts), just fed by Census-derived
// anchor tables (USD) instead of the Korean statistics ones.
import stateIncomeData from "@/data/us/stateIncome.json";
import countyIncomeData from "@/data/us/countyIncome.json";
import nationalIncomeData from "@/data/us/nationalIncome.json";
import netWorthPercentilesUS from "@/data/us/netWorthPercentilesUS.json";
import k401Data from "@/data/us/401kByAge.json";
import incomeByAgeData from "@/data/us/incomeByAge.json";
import netWorthByAgeData from "@/data/us/netWorthByAge.json";
import {
  getPercentileRankFromTable,
  getPercentileRankRelativeTo,
  clampDisplayPercent,
  type PercentileAnchor,
} from "@/lib/percentileTable";
import type { UsAgeBandId } from "@/lib/usInput";

export type UsAcs1YearIncome = {
  year: number;
  medianHouseholdIncome: number | null;
  percentileAnchors: PercentileAnchor[];
};

export type UsStateIncome = {
  fips: string;
  name: string;
  medianHouseholdIncome: number | null; // ACS 5-Year (acs5YearRange)
  percentileAnchors: PercentileAnchor[]; // ACS 5-Year
  latest1Year: UsAcs1YearIncome | null; // ACS 1-Year, latest single year (acs1Vintage)
};

// All 50 states + DC clear the ACS 1-year population threshold, so this
// vintage/range pair describes every state entry uniformly.
export const acs5YearRange = stateIncomeData.meta.acs5YearRange as string;
export const acs1Vintage = stateIncomeData.meta.acs1Vintage as number;

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

const incomeMedianByAgeBand = new Map<UsAgeBandId, number>(
  incomeByAgeData.bands.map((b) => [b.id as UsAgeBandId, b.median])
);
const netWorthAverageByAgeBand = new Map<UsAgeBandId, number>(
  netWorthByAgeData.bands.map((b) => [b.id as UsAgeBandId, b.average])
);

// "Top X% nationwide among people your age" — rescales the user's income by
// (national median / same-age median) and re-checks it against the same
// national percentile curve, exactly like getCountyIncomePercentile above.
// Median-based (not mean) because that's the real figure the Census API
// publishes by age band — see data/us/incomeByAge.json's meta.note for the
// age-bracket caveats.
export function getNationalIncomePercentileForAgeBand(ageBand: UsAgeBandId, annualIncome: number): number | null {
  const subgroupMedian = incomeMedianByAgeBand.get(ageBand);
  const anchors = nationalIncomeData.percentileAnchors as PercentileAnchor[];
  if (subgroupMedian == null || nationalMedianHouseholdIncome == null || anchors.length < 2) return null;
  return clampDisplayPercent(getPercentileRankRelativeTo(anchors, nationalMedianHouseholdIncome, subgroupMedian, annualIncome));
}

// Same idea for net worth, but mean-based (data/us/netWorthByAge.json), to
// match overallUsNetWorth.average and the SCF's own reporting.
export function getUsNetWorthPercentileForAgeBand(ageBand: UsAgeBandId, netWorth: number): number | null {
  const subgroupAverage = netWorthAverageByAgeBand.get(ageBand);
  const anchors = netWorthPercentilesUS.percentileAnchors as PercentileAnchor[];
  if (subgroupAverage == null || anchors.length < 2) return null;
  return clampDisplayPercent(getPercentileRankRelativeTo(anchors, overallUsNetWorth.average, subgroupAverage, netWorth));
}
