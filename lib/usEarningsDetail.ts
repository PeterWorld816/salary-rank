// Detailed occupation / education / potential-experience earnings
// percentiles — client-safe companion to lib/usOccupationIncome.ts.
//
// Every curve here comes from scripts/buildDetailedEarnings.ts: the same
// PUMS 2020-2024 5-Year file, the same PERNP x ADJINC income definition, the
// same PWGTP weight and the same 100-raw-record rule as the major-group
// occupation data, so switching one of these filters on never changes what
// "income" means. Only the small picker index (data/us/occupationDetails.json)
// is bundled; the curves are per-selection JSON files under public/, fetched
// on demand and cached for the page's lifetime — same pattern as
// public/us-occupation/<state>.json.
//
// Every resolver below returns the curve it actually used plus a `basis`
// naming that curve, so the UI can say exactly when it fell back to a
// broader group (and why) instead of silently swapping data.
import occupationDetailsData from "@/data/us/occupationDetailsIndex.json";
import type { Localized } from "@/lib/i18n";
import type { PercentileAnchor } from "@/lib/percentileTable";
import type { UsAgeBandId, UsGenderId } from "@/lib/usInput";

// ── Picker index ──────────────────────────────────────────────────────────

export type OccupationDetail = {
  id: string;
  majorId: string;
  label: Localized;
  isOther: boolean;
};

export const OCCUPATION_DETAILS: OccupationDetail[] = occupationDetailsData.details as OccupationDetail[];
const detailById = new Map(OCCUPATION_DETAILS.map((d) => [d.id, d]));

export function getOccupationDetail(id: string | null | undefined): OccupationDetail | null {
  return id ? detailById.get(id) ?? null : null;
}

export const EDUCATION_LEVELS = [
  { id: "hs_or_less", label: { en: "High school or less", ko: "고졸 이하" } },
  { id: "some_college", label: { en: "Some college or associate", ko: "대학 중퇴·전문학사" } },
  { id: "bachelors", label: { en: "Bachelor's", ko: "학사" } },
  { id: "masters", label: { en: "Master's", ko: "석사" } },
  { id: "professional", label: { en: "Professional degree", ko: "전문학위 (JD·MD 등)" } },
  { id: "doctorate", label: { en: "Doctorate", ko: "박사" } },
] as const;
export type UsEducationId = (typeof EDUCATION_LEVELS)[number]["id"];

export const EXPERIENCE_BANDS = [
  { id: "0-4", label: { en: "0–4 yrs", ko: "0~4년" } },
  { id: "5-9", label: { en: "5–9 yrs", ko: "5~9년" } },
  { id: "10-19", label: { en: "10–19 yrs", ko: "10~19년" } },
  { id: "20-29", label: { en: "20–29 yrs", ko: "20~29년" } },
  { id: "30plus", label: { en: "30+ yrs", ko: "30년 이상" } },
] as const;
export type UsExperienceId = (typeof EXPERIENCE_BANDS)[number]["id"];

export const EDUCATION_IDS: string[] = EDUCATION_LEVELS.map((e) => e.id);
export const EXPERIENCE_IDS: string[] = EXPERIENCE_BANDS.map((e) => e.id);

// Years of schooling behind "potential experience" — mirrors
// scripts/buildDetailedEarnings.ts's schoolingYears(); shown on the About page.
export const SCHOOLING_YEARS_NOTE = {
  en: "Estimated experience = age − years of schooling − 6. Years used: high school or less 12 (fewer for those who left before 12th grade), some college 13, associate 14, bachelor's 16, master's 18, professional 19, doctorate 21.",
  ko: "추정 경력 = 나이 − 교육 연수 − 6. 교육 연수: 고졸 이하 12년(고교 미졸업은 실제 학년), 대학 중퇴 13년, 전문학사 14년, 학사 16년, 석사 18년, 전문학위 19년, 박사 21년.",
};

// This app's age bands -> the PUMS buckets the build script used.
const AGE_TO_BUCKET: Record<UsAgeBandId, string | null> = {
  under25: null,
  "25-34": "25-34",
  "35-44": "35-44",
  "45-54": "45-54",
  "55-64": "55-64",
  "65plus": "65-99",
};
const SEX: Record<UsGenderId, "1" | "2"> = { male: "1", female: "2" };

type Entry = { rawCount: number; anchors?: PercentileAnchor[]; fallback?: true };
const usable = (e: Entry | undefined): e is Entry & { anchors: PercentileAnchor[] } => Boolean(e && e.anchors && e.anchors.length >= 2);

// ── Lazy files ────────────────────────────────────────────────────────────

type OccupationDetailFile = {
  id: string;
  byAgeSex: Record<string, Entry>;
  byAge: Record<string, Entry>;
  all: Entry;
  states: Record<string, { rawCount: number; anchors: PercentileAnchor[] }>;
};
type EducationFile = {
  id: string;
  byAgeSex: Record<string, Entry>;
  byAge: Record<string, Entry>;
  all: Entry;
  byMajor: Record<string, Entry>;
  statesWithData: string[];
};
// One state's education x age curves (both sexes) — only written for
// state/age cells with 100+ records.
type EducationStateFile = { id: string; state: string; byAge: Record<string, { rawCount: number; anchors: PercentileAnchor[] }> };
type ExperienceFile = { combos: Record<string, Entry> };

const cache = new Map<string, Promise<unknown>>();
function fetchJson<T>(url: string): Promise<T | null> {
  let p = cache.get(url) as Promise<T | null> | undefined;
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
      .catch(() => null);
    cache.set(url, p);
  }
  return p;
}
export const fetchOccupationDetailFile = (id: string) => fetchJson<OccupationDetailFile>(`/us-occupation-detail/${id}.json`);
export const fetchEducationFile = (id: string) => fetchJson<EducationFile>(`/us-education/${id}.json`);
export const fetchEducationStateFile = (stateAbbr: string, id: string) =>
  fetchJson<EducationStateFile>(`/us-education/state/${stateAbbr.toLowerCase()}/${id}.json`);
export const fetchExperienceFile = () => fetchJson<ExperienceFile>(`/us-experience.json`);

// ── Resolvers ─────────────────────────────────────────────────────────────

export type ResolvedCurve = {
  anchors: PercentileAnchor[];
  rawCount: number;
  // Which curve this is, for labelling; `usedFallback` is true whenever it
  // isn't the most specific one the visitor's answers asked for.
  basis: string;
  usedFallback: boolean;
  // Why it fell back, in plain words (null when it didn't).
  reason: Localized | null;
};

const SMALL = (what: Localized): Localized => ({
  en: `Fewer than 100 survey records for ${what.en} — shown against ${"{broader}"}`,
  ko: `${what.ko} 표본이 100건 미만이라 ${"{broader}"} 기준으로 표시`,
});
function reason(what: Localized, broader: Localized): Localized {
  const t = SMALL(what);
  return { en: t.en.replace("{broader}", broader.en), ko: t.ko.replace("{broader}", broader.ko) };
}

const SEX_WORD: Record<UsGenderId, Localized> = { male: { en: "men", ko: "남성" }, female: { en: "women", ko: "여성" } };

// Nationwide detail occupation x age x sex -> x age -> all ages/sexes.
export function resolveOccupationDetailCurve(file: OccupationDetailFile, ageBand: UsAgeBandId, gender: UsGenderId): ResolvedCurve | null {
  const bucket = AGE_TO_BUCKET[ageBand];
  const ageWord: Localized = { en: `this age band`, ko: "이 나이대" };
  if (bucket) {
    const e = file.byAgeSex[`${bucket}|${SEX[gender]}`];
    if (usable(e)) return { anchors: e.anchors, rawCount: e.rawCount, basis: "detail-age-sex", usedFallback: false, reason: null };
    const a = file.byAge[bucket];
    if (usable(a))
      return {
        anchors: a.anchors,
        rawCount: a.rawCount,
        basis: "detail-age",
        usedFallback: true,
        reason: reason({ en: `${SEX_WORD[gender].en} in ${ageWord.en}`, ko: `${ageWord.ko} ${SEX_WORD[gender].ko}` }, { en: "both sexes", ko: "남녀 합산" }),
      };
  }
  if (usable(file.all))
    return {
      anchors: file.all.anchors,
      rawCount: file.all.rawCount,
      basis: "detail-all",
      usedFallback: true,
      reason: bucket
        ? reason({ en: "this age band", ko: "이 나이대" }, { en: "all ages 25+", ko: "25세 이상 전체" })
        : { en: "No occupation data under age 25 — shown against all ages 25+", ko: "25세 미만 직업 데이터가 없어 25세 이상 전체 기준" },
    };
  return null;
}

export function resolveOccupationDetailStateCurve(file: OccupationDetailFile, stateAbbr: string): ResolvedCurve | null {
  const s = file.states[stateAbbr.toLowerCase()];
  return s && s.anchors.length >= 2 ? { anchors: s.anchors, rawCount: s.rawCount, basis: "detail-state", usedFallback: false, reason: null } : null;
}

// Nationwide education x age x sex -> x age -> all ages.
export function resolveEducationCurve(file: EducationFile, ageBand: UsAgeBandId, gender: UsGenderId): ResolvedCurve | null {
  const bucket = AGE_TO_BUCKET[ageBand];
  if (bucket) {
    const e = file.byAgeSex[`${bucket}|${SEX[gender]}`];
    if (usable(e)) return { anchors: e.anchors, rawCount: e.rawCount, basis: "edu-age-sex", usedFallback: false, reason: null };
    const a = file.byAge[bucket];
    if (usable(a))
      return {
        anchors: a.anchors,
        rawCount: a.rawCount,
        basis: "edu-age",
        usedFallback: true,
        reason: reason({ en: SEX_WORD[gender].en, ko: SEX_WORD[gender].ko }, { en: "both sexes", ko: "남녀 합산" }),
      };
  }
  if (usable(file.all))
    return {
      anchors: file.all.anchors,
      rawCount: file.all.rawCount,
      basis: "edu-all",
      usedFallback: true,
      reason: bucket
        ? reason({ en: "this age band", ko: "이 나이대" }, { en: "all ages 25+", ko: "25세 이상 전체" })
        : { en: "No education data under age 25 — shown against all ages 25+", ko: "25세 미만 학력 데이터가 없어 25세 이상 전체 기준" },
    };
  return null;
}

// State x education x age (both sexes) — null (caller shows nothing / the
// nationwide row) when the state didn't clear 100 records.
export function resolveEducationStateCurve(file: EducationStateFile, ageBand: UsAgeBandId): ResolvedCurve | null {
  const bucket = AGE_TO_BUCKET[ageBand];
  const s = bucket ? file.byAge[bucket] : undefined;
  return s && s.anchors.length >= 2 ? { anchors: s.anchors, rawCount: s.rawCount, basis: "edu-state-age", usedFallback: false, reason: null } : null;
}

export function resolveEducationMajorCurve(file: EducationFile, majorId: string): ResolvedCurve | null {
  const e = file.byMajor[majorId];
  return usable(e) ? { anchors: e.anchors, rawCount: e.rawCount, basis: "edu-major", usedFallback: false, reason: null } : null;
}

// Potential experience x education x sex -> x sex -> all.
export function resolveExperienceCurve(
  file: ExperienceFile,
  experience: UsExperienceId,
  education: UsEducationId | null,
  gender: UsGenderId
): ResolvedCurve | null {
  const sex = SEX[gender];
  if (education) {
    const e = file.combos[`${experience}|${education}|${sex}`];
    if (usable(e)) return { anchors: e.anchors, rawCount: e.rawCount, basis: "exp-edu-sex", usedFallback: false, reason: null };
  }
  const s = file.combos[`${experience}|*|${sex}`];
  if (usable(s))
    return {
      anchors: s.anchors,
      rawCount: s.rawCount,
      basis: "exp-sex",
      usedFallback: Boolean(education),
      reason: education ? reason({ en: "this education level", ko: "이 학력" }, { en: "all education levels", ko: "학력 전체" }) : null,
    };
  const a = file.combos[`${experience}|*|*`];
  if (usable(a))
    return {
      anchors: a.anchors,
      rawCount: a.rawCount,
      basis: "exp-all",
      usedFallback: true,
      reason: reason({ en: SEX_WORD[gender].en, ko: SEX_WORD[gender].ko }, { en: "both sexes", ko: "남녀 합산" }),
    };
  return null;
}

export function educationLabel(id: string | null): Localized | null {
  return EDUCATION_LEVELS.find((e) => e.id === id)?.label ?? null;
}
export function experienceLabel(id: string | null): Localized | null {
  return EXPERIENCE_BANDS.find((e) => e.id === id)?.label ?? null;
}
