// Occupation-based earnings percentile — client-safe (like lib/usIncomeCalc.ts),
// deliberately STATE-level only. scripts/buildOccupationIncome.ts's PUMS
// sample-size check (see that script's header comment) found county/PUMA-
// level occupation x age x sex breakdowns unreliable even in California's
// most-sampled PUMA, so this never resolves below "state" — there is no
// county/place equivalent to add later without more data.
//
// Income definition here is PERNP (personal earnings), not the household
// income the rest of /us's percentiles use (B19001/B19013 — see
// lib/usIncomeCalc.ts) — occupation is a personal attribute, a household
// doesn't have one. That's a real, deliberate difference in what "percent"
// means between this card and the location card next to it; the UI should
// not blur the two together.
import occupationCategoriesData from "@/data/us/occupationCategories.json";
import occupationIncomeNationalData from "@/data/us/occupationIncomeNational.json";
import { getIncomePercentileFromAnchors } from "@/lib/usIncomeCalc";
import { getValueAtPercentile, type PercentileAnchor } from "@/lib/percentileTable";
import type { UsAgeBandId, UsGenderId } from "@/lib/usInput";

export type OccupationCategory = {
  id: string;
  soc: string;
  occpRange: [number, number];
  label: { en: string; ko: string };
};

export const OCCUPATION_CATEGORIES: OccupationCategory[] = occupationCategoriesData.categories.filter(
  (c): c is OccupationCategory => (c as { selectable?: boolean }).selectable !== false
);

export function getOccupationCategory(occId: string | null): OccupationCategory | null {
  if (!occId) return null;
  return OCCUPATION_CATEGORIES.find((c) => c.id === occId) ?? null;
}

// This app's UsAgeBandId includes "under25", which PUMS OCCP-based earnings
// data was never built for (scripts/buildOccupationIncome.ts only bucketed
// ages 25-99, matching the earlier PUMS sample-size verification) — no
// occupation combo exists for it, ever. "65plus" maps onto the "65-99"
// bucket that script does produce.
const AGE_BAND_TO_OCC_BUCKET: Record<UsAgeBandId, string | null> = {
  under25: null,
  "25-34": "25-34",
  "35-44": "35-44",
  "45-54": "45-54",
  "55-64": "55-64",
  "65plus": "65-99",
};

export function occupationAgeBucket(ageBand: UsAgeBandId): string | null {
  return AGE_BAND_TO_OCC_BUCKET[ageBand] ?? null;
}

const GENDER_TO_SEX: Record<UsGenderId, "1" | "2"> = { male: "1", female: "2" };
export function occupationSexCode(gender: UsGenderId): "1" | "2" {
  return GENDER_TO_SEX[gender];
}

type NationalCombo = { occId: string; ageBand: string; sex: string; rawCount: number; anchors: PercentileAnchor[] };
const nationalByKey = new Map<string, NationalCombo>(
  (occupationIncomeNationalData.combos as NationalCombo[]).map((c) => [`${c.occId}|${c.ageBand}|${c.sex}`, c])
);

export type StateOccupationCombo = {
  occId: string;
  ageBand: string;
  sex: string;
  rawCount: number;
  fallback: boolean;
  anchors?: PercentileAnchor[];
};
export type StateOccupationFile = { state: string; combos: StateOccupationCombo[] };

// One fetch per state per page load, however many times the occupation
// field gets toggled — public/us-occupation/*.json is a static asset (no
// server function, no per-request compute; see scripts/buildOccupationIncome.ts),
// so this is just a plain cached fetch.
const stateFileCache = new Map<string, Promise<StateOccupationFile | null>>();

export function fetchStateOccupationData(stateAbbr: string): Promise<StateOccupationFile | null> {
  const key = stateAbbr.toLowerCase();
  let pending = stateFileCache.get(key);
  if (!pending) {
    pending = fetch(`/us-occupation/${key}.json`)
      .then((res) => (res.ok ? (res.json() as Promise<StateOccupationFile>) : null))
      .catch(() => null);
    stateFileCache.set(key, pending);
  }
  return pending;
}

export type OccupationPercentileResult = {
  percentile: number | null;
  usedFallback: boolean;
  rawCount: number;
};

// stateData null/still-loading is handled by the caller (shows a loading
// state) — this function assumes the fetch already resolved.
export function getOccupationIncomePercentile(
  annualIncome: number,
  occId: string,
  ageBucket: string,
  sex: "1" | "2",
  stateData: StateOccupationFile | null
): OccupationPercentileResult | null {
  const stateCombo = stateData?.combos.find((c) => c.occId === occId && c.ageBand === ageBucket && c.sex === sex);
  const nationalCombo = nationalByKey.get(`${occId}|${ageBucket}|${sex}`);

  if (stateCombo && !stateCombo.fallback && stateCombo.anchors && stateCombo.anchors.length > 0) {
    return {
      percentile: getIncomePercentileFromAnchors(stateCombo.anchors, annualIncome),
      usedFallback: false,
      rawCount: stateCombo.rawCount,
    };
  }
  if (nationalCombo && nationalCombo.anchors.length > 0) {
    return {
      percentile: getIncomePercentileFromAnchors(nationalCombo.anchors, annualIncome),
      usedFallback: true,
      rawCount: stateCombo?.rawCount ?? nationalCombo.rawCount,
    };
  }
  return null;
}

export type OccupationMedianResult = {
  value: number | null;
  usedFallback: boolean;
  rawCount: number;
};

// Same combos/fallback rule as getOccupationIncomePercentile above, just
// reading the p50 anchor value instead of ranking one visitor's income
// against the curve — this is what shades the nationwide map by occupation
// (see components/us/useOccupationMapData.ts) instead of computing a
// percentile for a single person.
export function getOccupationMedianIncome(
  occId: string,
  ageBucket: string,
  sex: "1" | "2",
  stateData: StateOccupationFile | null
): OccupationMedianResult | null {
  const stateCombo = stateData?.combos.find((c) => c.occId === occId && c.ageBand === ageBucket && c.sex === sex);
  const nationalCombo = nationalByKey.get(`${occId}|${ageBucket}|${sex}`);

  if (stateCombo && !stateCombo.fallback && stateCombo.anchors && stateCombo.anchors.length > 0) {
    return { value: getValueAtPercentile(stateCombo.anchors, 50), usedFallback: false, rawCount: stateCombo.rawCount };
  }
  if (nationalCombo && nationalCombo.anchors.length > 0) {
    return {
      value: getValueAtPercentile(nationalCombo.anchors, 50),
      usedFallback: true,
      rawCount: stateCombo?.rawCount ?? nationalCombo.rawCount,
    };
  }
  return null;
}
