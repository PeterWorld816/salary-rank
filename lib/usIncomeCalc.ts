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
import type { UsAgeBandId, UsGenderId, UsMaritalStatusId } from "@/lib/usInput";
import { US_STATES } from "@/data/us/stateMeta";
// Type-only — zero runtime cost, same reasoning as the `export type { ... }`
// re-export a few lines down: erased entirely at compile time, so it never
// triggers usCountyPlaceData.ts's `import "server-only"` guard even though
// this file itself is client-safe.
import type { UsCountyIncome, UsPlaceIncome } from "@/lib/usCountyPlaceData";

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

// This state's rank by median household income among the 50 states + D.C.
// — the same real pages this site actually has (see data/us/stateMeta.ts's
// US_STATES); stateIncome.json also carries a Puerto Rico row the Census
// publishes alongside the states, which is deliberately excluded here so
// "rank 1 of 51" always matches an actual /us/{state} page on this site.
const REAL_STATE_FIPS = new Set(US_STATES.map((s) => s.fips));

export function getStateIncomeRank(stateFips: string): { rank: number; total: number } | null {
  const ranked = getAllStateIncomes()
    .filter((s) => REAL_STATE_FIPS.has(s.fips) && s.medianHouseholdIncome != null)
    .sort((a, b) => (b.medianHouseholdIncome as number) - (a.medianHouseholdIncome as number));

  const index = ranked.findIndex((s) => s.fips === stateFips);
  if (index === -1) return null;
  return { rank: index + 1, total: ranked.length };
}

// The `limit` closest-ranked states on each side of this one, for a "similar
// states" list — e.g. rank 25 of 51 with limit=2 returns ranks 23-27 minus
// this state itself. Same ranked order/exclusions as getStateIncomeRank.
export function getNearbyRankedStates(stateFips: string, limit = 2): UsStateIncome[] {
  const ranked = getAllStateIncomes()
    .filter((s) => REAL_STATE_FIPS.has(s.fips) && s.medianHouseholdIncome != null)
    .sort((a, b) => (b.medianHouseholdIncome as number) - (a.medianHouseholdIncome as number));

  const index = ranked.findIndex((s) => s.fips === stateFips);
  if (index === -1) return [];

  const start = Math.max(0, index - limit);
  const end = Math.min(ranked.length, index + limit + 1);
  return ranked.slice(start, end).filter((s) => s.fips !== stateFips);
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

// ── "Which median is this view showing?" ──────────────────────────────────
// The choropleth used to always paint medianHouseholdIncome; it now paints
// whichever breakdown the visitor's answers select. A basis is the resolved
// answer to that question — one axis, plus the unit that axis is measured in,
// so callers never have to re-derive "is this household or individual money?"
// from the axis name.
//
// `unit` matters because the two breakdowns are NOT the same quantity:
// byMaritalStatus (and medianHouseholdIncome) are *household* income, while
// byGender is *individual* median earnings — see the UsByGenderIncome note
// above. Anything that renders a basis has to say which one it's showing, or
// it's silently comparing two different things.
export type UsIncomeBasis =
  | { axis: "household"; unit: "household" }
  | { axis: "maritalStatus"; maritalStatus: UsMaritalStatusId; unit: "household" }
  | { axis: "gender"; gender: UsGenderId; unit: "individual" };

// Turns the visitor's (possibly partial) demographic selection into exactly
// one basis.
//
// Marital status wins when both axes are selected. That's not a preference —
// it's forced by the data: the Census publishes each breakdown as its own
// *marginal* table (B20017 by sex, B19126/B19215 by household type) and never
// their cross-tabulation, so no "median income of single women in this county"
// figure exists to show. One axis has to be dropped, and dropping gender is
// the safer drop: byMaritalStatus is household income, the same unit as the
// medianHouseholdIncome fallback and the same unit every other number on the
// page is quoted in, so the map stays internally comparable. Preferring
// byGender instead would mix individual earnings into a household-income
// scale (and into the household-income fallback for counties missing the
// breakdown), which would be a genuinely wrong number rather than a coarser one.
export function resolveIncomeBasis(
  gender: UsGenderId | null,
  maritalStatus: UsMaritalStatusId | null
): UsIncomeBasis {
  if (maritalStatus != null) return { axis: "maritalStatus", maritalStatus, unit: "household" };
  if (gender != null) return { axis: "gender", gender, unit: "individual" };
  return { axis: "household", unit: "household" };
}

// Anything carrying the two breakdowns plus the overall median — structural
// rather than `UsCountyIncome` so a state row (which has the same three
// fields) works too, and so this stays usable from a client component holding
// an already-resolved object.
export type UsIncomeBreakdownSource = {
  medianHouseholdIncome: number | null;
  byGender: UsByGenderIncome;
  byMaritalStatus: UsByMaritalStatusIncome;
};

// The one number a given basis picks out of a county/state, with the same
// never-guess fallback contract as resolveIncomeReference above: when this
// geography never published (or couldn't reliably estimate) the selected
// breakdown, it falls back to the overall household median and flags it with
// usedFallback so the UI can label that geography honestly.
export function resolveBasisIncome(source: UsIncomeBreakdownSource, basis: UsIncomeBasis): UsIncomeReference {
  // The plain household basis IS the fallback target, so it can never be a
  // fallback *from* anything — returning usedFallback: true here (which
  // resolveIncomeReference(null, median) would) would label all 3,144
  // counties as "no breakdown published" on the default view.
  if (basis.axis === "household") return { value: source.medianHouseholdIncome, usedFallback: false };
  const detail = basis.axis === "maritalStatus" ? source.byMaritalStatus[basis.maritalStatus] : source.byGender[basis.gender];
  return resolveIncomeReference(detail, source.medianHouseholdIncome);
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

// "Most specific percentile available for a location" — place (if one's
// selected) falling back to county, then state, then nationwide. This is
// the same fallback order PersonalizedResult.tsx and useCompactResult.ts
// each already inline once for a single person; the compare page needs the
// identical logic twice (inviter and friend, same location), so it's
// factored out here rather than duplicated a third time.
export function getMostSpecificIncomePercentile(
  annualIncome: number,
  stateFips: string,
  county: UsCountyIncome | null,
  place: UsPlaceIncome | null
): number | null {
  if (place && county) {
    const placePercentile = getPlaceIncomePercentileFromCounty(
      county.medianHouseholdIncome,
      county.percentileAnchors,
      place.medianHouseholdIncome,
      annualIncome
    );
    if (placePercentile != null) return placePercentile;
  }
  if (county) {
    const countyPercentile = getIncomePercentileFromAnchors(county.percentileAnchors, annualIncome);
    if (countyPercentile != null) return countyPercentile;
  }
  return getStateIncomePercentile(stateFips, annualIncome) ?? getNationalIncomePercentile(annualIncome);
}

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
