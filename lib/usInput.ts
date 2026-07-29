// Query-string codec for the /us section — mirrors the "?d=..." pattern from
// lib/salaryCalc.ts so the input panel's answers survive navigation from
// /us -> /us/[state] -> /us/[state]/[county] without a server round trip.
//
// ageBand isn't in the spec's listed input panel fields, but it's required to
// compare a 401k balance against data/us/401kByAge.json (which is bucketed by
// age) — so it's folded in here as a sixth field alongside gender/marital/
// income/net worth/401k.
import k401Data from "@/data/us/401kByAge.json";

export type UsGenderId = "male" | "female";
export type UsMaritalStatusId = "single" | "married";
export type UsAgeBandId = (typeof k401Data.bands)[number]["id"];

export const US_AGE_BANDS = k401Data.bands;

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
export function buildUsSearchParams(input: UsInput, lang: string): URLSearchParams {
  return new URLSearchParams({ d: encodeUsInput(input), lang });
}

export function appendUsQuery(pathname: string, queryString: string): string {
  return queryString ? `${pathname}?${queryString}` : pathname;
}
