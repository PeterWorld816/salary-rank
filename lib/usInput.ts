// Query-string codec for explicit share and compare links in the /us section.
// Routine calculator changes stay in React state instead of the address bar.
//
// ageBand isn't in the spec's listed input panel fields, but it's required to
// compare a 401k balance against data/us/401kByAge.json (which is bucketed by
// age) — so it's folded in here as a sixth field alongside gender/marital/
// income/net worth/401k.
import k401Data from "@/data/us/401kByAge.json";
import type { Localized } from "@/lib/i18n";
import { EDUCATION_IDS, EXPERIENCE_IDS, type UsEducationId, type UsExperienceId } from "@/lib/usEarningsDetail";

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
  annualIncome: number; // USD, pre-tax — the one field required to see a result
  netWorth: number | null; // USD, excludes 401k — optional, behind the "more accurate result" section
  k401: number | null; // USD, 401k balance only — optional, same section
  // Occupation major-group id (data/us/occupationCategories.json), or null
  // for "Overall" (no occupation filter) — optional, adds the state-level-
  // only "occupation" card to the result page. See lib/usOccupationIncome.ts.
  occupation: string | null;
  // Detailed occupation id (data/us/occupationDetails.json) inside
  // `occupation`'s major group, or null for "the whole major group". The
  // major group stays set alongside it so map shading (major-group only)
  // keeps working unchanged.
  occupationDetail: string | null;
  // Optional result-card-only filters (never used for map shading) — see
  // lib/usEarningsDetail.ts.
  education: UsEducationId | null;
  experience: UsExperienceId | null; // *estimated* (potential) experience band
};

// The answer set a fresh visitor starts from — shared with UsInputPanel.tsx
// and with the "Personalized"
// map SHADING (components/us/mapBasisLens.ts / UsInputPanel.tsx's apply()),
// which needs to know when the visitor has moved away from every default
// answer so it can switch SHADING on, and back to "All households" when
// they've moved back.
export const DEFAULT_US_INPUT: UsInput = {
  gender: "male",
  maritalStatus: "single",
  ageBand: "25-34",
  annualIncome: 75000,
  netWorth: null,
  k401: null,
  occupation: null,
  occupationDetail: null,
  education: null,
  experience: null,
};

// True only when every field SHADING's "Personalized" combination cares
// about (gender/maritalStatus/ageBand/occupation) still matches the
// out-of-the-box answer — annualIncome/netWorth/k401 never affect the map,
// so they're deliberately left out of this check.
export function isDefaultUsInputSelection(input: UsInput): boolean {
  return (
    input.gender === DEFAULT_US_INPUT.gender &&
    input.maritalStatus === DEFAULT_US_INPUT.maritalStatus &&
    input.ageBand === DEFAULT_US_INPUT.ageBand &&
    input.occupation === DEFAULT_US_INPUT.occupation
  );
}

const GENDER_IDS: UsGenderId[] = ["male", "female"];
const MARITAL_IDS: UsMaritalStatusId[] = ["single", "married"];
const AGE_BAND_IDS = US_AGE_BANDS.map((b) => b.id);

// netWorth/k401 encode as an empty segment when unset — "male.single.25-34.75000.."
// still splits into exactly 6 parts, so the format doesn't need a version bump.
function encodeOptional(value: number | null): string {
  return value == null ? "" : String(value);
}

function decodeOptional(raw: string): { value: number | null; valid: boolean } {
  if (raw === "") return { value: null, valid: true };
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? { value: n, valid: true } : { value: null, valid: false };
}

export function encodeUsInput(input: UsInput): string {
  return [
    input.gender,
    input.maritalStatus,
    input.ageBand,
    input.annualIncome,
    encodeOptional(input.netWorth),
    encodeOptional(input.k401),
    // 7th segment, added after occupation shipped — decodeUsInput below
    // still accepts the old 6-part form (occupation just comes back null),
    // so links shared before this existed keep working.
    input.occupation ?? "",
    // 8th-10th segments, appended for detailed occupation / education /
    // estimated experience — older 6- and 7-part links still decode below
    // with these as null.
    input.occupationDetail ?? "",
    input.education ?? "",
    input.experience ?? "",
  ].join(".");
}

export function decodeUsInput(raw: string): UsInput | null {
  const parts = raw.split(".");
  if (parts.length < 6 || parts.length > 10) return null;
  const [gender, maritalStatus, ageBand, incomeRaw, netWorthRaw, k401Raw, occupationRaw, detailRaw, educationRaw, experienceRaw] = parts;

  const annualIncome = Number(incomeRaw);
  const netWorth = decodeOptional(netWorthRaw);
  const k401 = decodeOptional(k401Raw);

  if (
    !GENDER_IDS.includes(gender as UsGenderId) ||
    !MARITAL_IDS.includes(maritalStatus as UsMaritalStatusId) ||
    !AGE_BAND_IDS.includes(ageBand as UsAgeBandId) ||
    !Number.isFinite(annualIncome) ||
    annualIncome <= 0 ||
    !netWorth.valid ||
    !k401.valid
  ) {
    return null;
  }

  return {
    gender: gender as UsGenderId,
    maritalStatus: maritalStatus as UsMaritalStatusId,
    ageBand: ageBand as UsAgeBandId,
    annualIncome,
    netWorth: netWorth.value,
    k401: k401.value,
    occupation: occupationRaw ? occupationRaw : null,
    occupationDetail: detailRaw && occupationRaw ? detailRaw : null,
    // Unknown ids (e.g. a future level) are dropped rather than failing the
    // whole link.
    education: educationRaw && EDUCATION_IDS.includes(educationRaw) ? (educationRaw as UsEducationId) : null,
    experience: experienceRaw && EXPERIENCE_IDS.includes(experienceRaw) ? (experienceRaw as UsExperienceId) : null,
  };
}

export function buildUsShareHref(
  pathname: string,
  existing: URLSearchParams,
  input: UsInput,
  lang: string
): string {
  const params = new URLSearchParams(existing);
  params.delete("d");
  params.delete("lens");
  params.set("d", encodeUsInput(input));
  params.set("lang", lang);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function withoutTransientInputParams(existing: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(existing);
  params.delete("d");
  params.delete("lang");
  params.delete("lens");
  return params;
}

// "Compare with a friend" challenge snapshot — deliberately just a
// percentile + location code, no personal data, decodable by anyone with
// the link (same no-server-storage principle as the rest of /us).
//
// Superseded by buildCompareInviteHref/the /us/compare/[inviteId] route
// below, which shows an actual side-by-side comparison instead of just a
// banner on the sharer's own page — kept only so links people already
// shared under the old scheme keep working (see the friend-banner code in
// PersonalizedResult.tsx, which still decodes this).
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

// "Compare with a friend" invite link — unlike FriendChallenge above, this
// carries the inviter's *full* answer set (not just a percentile), encoded
// with the exact same encodeUsInput used for every other /us link, so
// /us/compare/[inviteId] can compute a live, real comparison instead of
// showing a static "you beat X%" banner. Location travels as ordinary
// ?st=/?co=/?pl= query params — the same convention the rest of /us
// already uses — so this never needs its own server-side storage either.
// Reused by both PersonalizedResult's "Compare with a friend" button (the
// inviter is "you") and the compare page's own "Share this comparison"
// button (the inviter is whichever side just filled in their answers).
export function buildCompareInviteHref(
  base: string,
  input: UsInput,
  lang: string,
  stateAbbr: string,
  countyFips: string,
  placeFips?: string | null
): string {
  const params = new URLSearchParams({ st: stateAbbr, co: countyFips, lang });
  if (placeFips) params.set("pl", placeFips);
  return `${base}/compare/${encodeUsInput(input)}?${params.toString()}`;
}
