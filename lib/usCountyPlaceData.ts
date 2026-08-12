// County/place income lookups — split out from lib/usIncomeCalc.ts because
// countyIncome.json (~5.3MB) and placeIncome.json (~6.8MB) must never reach
// the client bundle. `server-only` throws at build time if anything here is
// ever imported from a "use client" file, so a future accidental import
// fails loudly instead of silently bloating every /us/* page's First Load
// JS by ~12MB (which is what happened before this split — see git history).
// Client components that need a specific county/place's numbers should
// receive the already-resolved (small) object as a prop from a server
// component instead of importing anything from here; percentile math on an
// already-resolved object lives in lib/usIncomeCalc.ts (client-safe).
import "server-only";
import countyIncomeData from "@/data/us/countyIncome.json";
import placeIncomeData from "@/data/us/placeIncome.json";
import type { PercentileAnchor } from "@/lib/percentileTable";
import type { UsByGenderIncome, UsByMaritalStatusIncome } from "@/lib/usIncomeCalc";

export type UsCountyIncome = {
  fips: string;
  stateFips: string;
  name: string;
  medianHouseholdIncome: number | null;
  percentileAnchors: PercentileAnchor[];
  byGender: UsByGenderIncome;
  byMaritalStatus: UsByMaritalStatusIncome;
};

// Places (cities/towns/CDPs) — unlike state/county, no percentileAnchors here:
// see scripts/fetchCensusData.ts's meta.note on placeIncome.json for why (a
// 16-point curve per place, times 32,000+ places, would have bloated this
// file to ~45MB). getPlaceIncomePercentileFromCounty (lib/usIncomeCalc.ts)
// rescales against the parent county's curve instead, same technique as
// getNationalIncomePercentileForAgeBand there.
export type UsPlaceIncome = {
  fips: string;
  stateFips: string;
  countyFips: string;
  name: string;
  medianHouseholdIncome: number | null;
  lat: number;
  lng: number;
};

const countyByFips = new Map<string, UsCountyIncome>(
  (countyIncomeData.counties as UsCountyIncome[]).map((c) => [c.fips, c])
);
const placeByFips = new Map<string, UsPlaceIncome>((placeIncomeData.places as UsPlaceIncome[]).map((p) => [p.fips, p]));

export function getCountyIncome(countyFips: string): UsCountyIncome | null {
  return countyByFips.get(countyFips) ?? null;
}

export function getCountiesForState(stateFips: string): UsCountyIncome[] {
  return (countyIncomeData.counties as UsCountyIncome[]).filter((c) => c.stateFips === stateFips);
}

export function getPlaceIncome(placeFips: string): UsPlaceIncome | null {
  return placeByFips.get(placeFips) ?? null;
}

export function getPlacesForCounty(countyFips: string): UsPlaceIncome[] {
  return (placeIncomeData.places as UsPlaceIncome[]).filter((p) => p.countyFips === countyFips);
}
