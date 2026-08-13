// US income/net worth/401k percentile lookups for the /us section — reuses
// the same generic log-log percentile interpolation as lib/salaryCalc.ts and
// lib/netWorthCalc.ts (lib/percentileTable.ts), just fed by Census-derived
// anchor tables (USD) instead of the Korean statistics ones.
//
// Deliberately client-safe: every JSON this file imports is small (state has
// 51 rows, national/net-worth/401k/age-band tables are single objects). The
// two genuinely large datasets — countyIncome.json (~5.3MB) and
// placeIncome.json (~6.8MB) — live in lib/usCountyPlaceData.ts instead,
// guarded by `server-only`, so they can never end up in a client bundle.
// Client components that need one specific county/place's numbers take the
// already-resolved object as a prop (from a server component that does the
// fips lookup) and feed it through the pure helpers below instead of doing
// their own fips -> object lookup against the full dataset.
import stateIncomeData from "@/data/us/stateIncome.json";
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

// Sex/household-type breakdowns (Census tables B20017, B19126, B19215 — see
// scripts/fetchCensusData.ts) — either side is null when that geography's
// estimate wasn't published or its margin of error was too large to trust.
// Note byGender is *individual median earnings*, not household income like
// the rest of this file — the two aren't directly comparable, but each is
// the right "does someone like me clear the local median" reference for its
// own axis.
export type UsByGenderIncome = { male: number | null; female: number | null };
export type UsByMaritalStatusIncome = { married: number | null; single: number | null };

export type UsStateIncome = {
  fips: string;
  name: string;
  medianHouseholdIncome: number | null; // ACS 5-Year (acs5YearRange)
  percentileAnchors: PercentileAnchor[]; // ACS 5-Year
  byGender: UsByGenderIncome;
  byMaritalStatus: UsByMaritalStatusIncome;
  latest1Year: UsAcs1YearIncome | null; // ACS 1-Year, latest single year (acs1Vintage)
};

// All 50 states + DC clear the ACS 1-year population threshold, so this
// vintage/range pair describes every state entry uniformly.
export const acs5YearRange = stateIncomeData.meta.acs5YearRange as string;
export const acs1Vintage = stateIncomeData.meta.acs1Vintage as number;

// County/place types and their fips -> object lookups live in
// lib/usCountyPlaceData.ts (server-only) — re-exported here as types only
// (zero runtime cost) so existing imports of `UsCountyIncome`/`UsPlaceIncome`
// from this module keep working.
export type { UsCountyIncome, UsPlaceIncome } from "@/lib/usCountyPlaceData";

const stateByFips = new Map<string, UsStateIncome>((stateIncomeData.states as UsStateIncome[]).map((s) => [s.fips, s]));

export function getStateIncome(stateFips: string): UsStateIncome | null {
  return stateByFips.get(stateFips) ?? null;
}

export function getAllStateIncomes(): UsStateIncome[] {
  return stateIncomeData.states as UsStateIncome[];
}

// The "reference value" shown alongside a county's overall median — prefers
// the gender/marital-status-specific figure, and falls back to the overall
// household median (with usedFallback: true) when this county never
// published (or couldn't reliably estimate) that breakdown. Never guesses.
// Pure — takes the detail/overall numbers directly rather than looking a
// county up by fips, so it works equally from an already-resolved county
// object (client-side) or a fips-based lookup (server-side, see
// lib/usCountyPlaceData.ts).
export type UsIncomeReference = { value: number | null; usedFallback: boolean };

export function resolveIncomeReference(detail: number | null, overallMedian: number | null): UsIncomeReference {
  if (detail != null) return { value: detail, usedFallback: false };
  return { value: overallMedian, usedFallback: overallMedian != null };
}

// Percentile-from-anchors, exposed as a pure function so a client component
// holding an already-resolved county/place object (passed down as a prop
// from a server component) can compute a percentile without importing the
// fips -> object lookup itself (see getCountyIncomePercentile's fips-based
// equivalent in lib/usCountyPlaceData.ts).
export function getIncomePercentileFromAnchors(anchors: PercentileAnchor[], annualIncome: number): number | null {
  if (anchors.length < 2) return null;
  return clampDisplayPercent(getPercentileRankFromTable(anchors, annualIncome));
}

// Place-level equivalent — "top X% in this specific city", the parent
// county's real B19001-derived curve re-centered on the place's own median
// (place / county median ratio) rather than a distribution unique to the
// place itself, since we don't store one (see scripts/fetchCensusData.ts's
// meta.note on placeIncome.json for why). Takes the county's numbers and the
// place's median directly rather than fips, for the same reason as above.
export function getPlaceIncomePercentileFromCounty(
  countyMedianHouseholdIncome: number | null,
  countyPercentileAnchors: PercentileAnchor[],
  placeMedianHouseholdIncome: number | null,
  annualIncome: number
): number | null {
  if (placeMedianHouseholdIncome == null || countyMedianHouseholdIncome == null || countyPercentileAnchors.length < 2) return null;
  return clampDisplayPercent(
    getPercentileRankRelativeTo(countyPercentileAnchors, countyMedianHouseholdIncome, placeMedianHouseholdIncome, annualIncome)
  );
}

export function getStateIncomePercentile(stateFips: string, annualIncome: number): number | null {
  const state = getStateIncome(stateFips);
  if (!state || state.percentileAnchors.length < 2) return null;
  return clampDisplayPercent(getPercentileRankFromTable(state.percentileAnchors, annualIncome));
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
// national percentile curve, exactly like getIncomePercentileFromAnchors
// above. Median-based (not mean) because that's the real figure the Census API
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
