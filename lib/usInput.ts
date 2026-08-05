// Query-string codec for the /us section — mirrors the "?d=..." pattern from
// lib/salaryCalc.ts so the input panel's answers survive navigation from
// /us -> /us/[state] -> /us/[state]/[county] without a server round trip.
//
// ageBand isn't in the spec's listed input panel fields, but it's required to
// compare a 401k balance against data/us/401kByAge.json (which is bucketed by
// age) — so it's folded in here as a sixth field alongside gender/marital/
// income/net worth/401k.
import k401Data from "@/data/us/401kByAge.json";
import type { Localized } from "@/lib/i18n";

export type UsGenderId = "male" | "female";
export type UsMaritalStatusId = "single" | "married";
export type UsAgeBandId = (typeof k401Data.bands)[number]["id"];

export const US_AGE_BANDS = k401Data.bands;

export const US_GENDERS: { id: UsGenderId; label: Localized }[] = [
  { id: "male", label: { ko: "남성", en: "Male" } },
  { id: "female", label: { ko: "여성", en: "Female" } },
];

export const US_MARITAL_STATUSES: { id: UsMaritalStatusId; label: Localized }[] = [
  { id: "single", label: { ko: "미혼", en: "Single" } },
  { id: "married", label: { ko: "기혼", en: "Married" } },
];

export type UsInput = {
  gender: UsGenderId;
  maritalStatus: UsMaritalStatusId;
  ageBand: UsAgeBandId;
  annualIncome: number; // USD, pre-tax
  netWorth: number; // USD, excludes 401k
  k401: number; // USD, 401k balance only
};

const GENDER_IDS: UsGenderId[] = ["male", "female"];
const MARITAL_IDS: UsMaritalStatusId[] = ["single", "married"];
const AGE_BAND_IDS = US_AGE_BANDS.map((b) => b.id);

export function encodeUsInput(input: UsInput): string {
  return [input.gender, input.maritalStatus, input.ageBand, input.annualIncome, input.netWorth, input.k401].join(".");
}

export function decodeUsInput(raw: string): UsInput | null {
  const parts = raw.split(".");
  if (parts.length !== 6) return null;
  const [gender, maritalStatus, ageBand, incomeRaw, netWorthRaw, k401Raw] = parts;

  const annualIncome = Number(incomeRaw);
  const netWorth = Number(netWorthRaw);
  const k401 = Number(k401Raw);

  if (
    !GENDER_IDS.includes(gender as UsGenderId) ||
    !MARITAL_IDS.includes(maritalStatus as UsMaritalStatusId) ||
    !AGE_BAND_IDS.includes(ageBand as UsAgeBandId) ||
    !Number.isFinite(annualIncome) ||
    annualIncome <= 0 ||
    !Number.isFinite(netWorth) ||
    netWorth < 0 ||
    !Number.isFinite(k401) ||
    k401 < 0
  ) {
    return null;
  }

  return {
    gender: gender as UsGenderId,
    maritalStatus: maritalStatus as UsMaritalStatusId,
    ageBand: ageBand as UsAgeBandId,
    annualIncome,
    netWorth,
    k401,
  };
}

// Builds the query string used for every /us link (map clicks, back links).
// `from` (a friend-challenge snapshot, see encodeFriendChallenge below) is
// carried through explicitly here because apply()/homeHref in
// UsInputPanel.tsx rebuild the query string from scratch rather than
// patching the existing one — every other /us link just reuses the current
// search string verbatim and so preserves it automatically.
export function buildUsSearchParams(input: UsInput, lang: string, from?: string | null): URLSearchParams {
  const params = new URLSearchParams({ d: encodeUsInput(input), lang });
  if (from) params.set("from", from);
  return params;
}

export function appendUsQuery(pathname: string, queryString: string): string {
  return queryString ? `${pathname}?${queryString}` : pathname;
}

// "Compare with a friend" challenge snapshot — deliberately just a
// percentile + location code, no personal data, decodable by anyone with
// the link (same no-server-storage principle as the rest of /us).
export type FriendChallenge = {
  percentile: number; // the sharer's own county (or nationwide) top-%
  stateAbbr: string;
  countyFips: string;
};

export function encodeFriendChallenge(challenge: FriendChallenge): string {
  return [challenge.percentile, challenge.stateAbbr, challenge.countyFips].join(".");
}

export function decodeFriendChallenge(raw: string): FriendChallenge | null {
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [percentileRaw, stateAbbr, countyFips] = parts;
  const percentile = Number(percentileRaw);
  if (!Number.isFinite(percentile) || percentile < 1 || percentile > 99) return null;
  if (!stateAbbr || !countyFips) return null;
  return { percentile, stateAbbr, countyFips };
}
