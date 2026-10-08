// Result guide — the numbers and sentences behind the three tabs under the
// result card ("Your result" / "What moves you" / "What if?", see
// components/us/result/ResultGuideTabs.tsx).
//
// No new statistics are computed here. Every income percentile this app
// shows is, underneath, the same operation: look `income * scale` up on a
// published anchor table (lib/percentileTable.ts) — scale is 1 for a plain
// lookup, overallMedian/subgroupMedian for the re-centered ones
// (getContextualIncomePercentile, getNationalIncomePercentileForAgeBand,
// the place-from-county rescale). A RankScope just names that pair so the
// same curve can answer "what percent is $X" (identical to the card's own
// number), "what does Top Y% start at" (the inverse lookup), and a
// precomputed cutoff table for the slider — without three code paths that
// could drift apart.
//
// Every sentence is assembled from the visitor's own numbers, place, and
// age band; copy varies by percentile band and by distance from the median
// rather than repeating one fixed paragraph. Descriptive only — nothing in
// here tells anyone what to do with their money.
import { formatTemplate, type LangCode } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";
import {
  clampDisplayPercent,
  getPercentileRankFromTable,
  getValueAtPercentile,
  type PercentileAnchor,
} from "@/lib/percentileTable";
import {
  acs5YearRange,
  getAllStateIncomes,
  nationalMedianHouseholdIncome,
  netWorthScaleForMedian,
  type UsCountyIncome,
  type UsPlaceIncome,
  type UsStateIncome,
} from "@/lib/usIncomeCalc";
import { US_AGE_BANDS, type UsAgeBandId, type UsInput } from "@/lib/usInput";
import { US_STATES, type StateMeta } from "@/data/us/stateMeta";
import nationalIncomeData from "@/data/us/nationalIncome.json";
import incomeByAgeData from "@/data/us/incomeByAge.json";
import netWorthByAgeData from "@/data/us/netWorthByAge.json";
import netWorthPercentilesUS from "@/data/us/netWorthPercentilesUS.json";

export const GUIDE_MILESTONES = [50, 25, 10, 5, 1] as const;

export type IncomeScopeKey =
  | "national"
  | "ageIncome"
  | "gender"
  | "state"
  | "county"
  | "place"
  | "occupation"
  | "occupationDetail"
  | "occupationDetailState"
  | "education"
  | "educationState"
  | "educationMajor"
  | "experience";

// A pre-resolved personal-earnings curve from the detailed PUMS data (see
// components/us/result/useDetailedEarnings.ts) — already a fallback-aware
// pick, so it slots in as a plain scale-1 scope.
export type GuideExtraRow = {
  key: "occupationDetail" | "occupationDetailState" | "education" | "educationState" | "educationMajor" | "experience";
  label: string;
  anchors: PercentileAnchor[];
  note: string | null;
};
export type HeadlineKey = IncomeScopeKey | "netWorth" | "ageNetWorth";

export type RankScope = {
  key: IncomeScopeKey;
  anchors: PercentileAnchor[];
  scale: number;
  // The group's own published median (not the interpolated p50) — what
  // "N× the median" is measured against.
  median: number | null;
  // "among single households in Travis County" — slots after a number.
  where: string;
  // Short row label for the comparison list.
  label: string;
  // Shown under the row when the number isn't the group's own data.
  note: string | null;
};

const L = (lang: LangCode, ko: string, en: string) => (lang === "ko" ? ko : en);

export function scopePercent(scope: Pick<RankScope, "anchors" | "scale">, income: number): number {
  return clampDisplayPercent(getPercentileRankFromTable(scope.anchors, income * scope.scale));
}

// Income at which this scope's displayed percent becomes exactly `topPercent`.
export function scopeCutoff(scope: Pick<RankScope, "anchors" | "scale">, topPercent: number): number | null {
  const v = getValueAtPercentile(scope.anchors, topPercent);
  return v == null ? null : v / scope.scale;
}

// thresholds[k-1] = smallest income whose *displayed* percent is <= k, for
// k = 1..98 (display rounds, so that's the raw percent k + 0.5 boundary).
// Lookup is a binary search — cheap enough to run on every slider frame.
export function buildCutoffTable(scope: Pick<RankScope, "anchors" | "scale">): Float64Array {
  const table = new Float64Array(98);
  for (let k = 1; k <= 98; k++) table[k - 1] = (getValueAtPercentile(scope.anchors, k + 0.5) ?? Infinity) / scope.scale;
  return table;
}

export function lookupDisplayPercent(table: Float64Array, income: number): number {
  // thresholds are descending in income as k grows; find the first k whose
  // threshold this income beats.
  let lo = 0;
  let hi = table.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (income > table[mid]) hi = mid;
    else lo = mid + 1;
  }
  return lo < table.length ? lo + 1 : 99;
}

// ── Labels ────────────────────────────────────────────────────────────────

export function ageBandLabel(ageBand: UsAgeBandId, lang: LangCode): string {
  const band = US_AGE_BANDS.find((b) => b.id === ageBand);
  return band ? band.label[lang] : ageBand;
}

function ageWho(ageBand: UsAgeBandId, lang: LangCode): string {
  if (lang === "ko") return `${ageBandLabel(ageBand, lang)}`;
  if (ageBand === "under25") return "under 25";
  if (ageBand === "65plus") return "65 and over";
  return `aged ${ageBandLabel(ageBand, lang)}`;
}

const MARITAL = { single: { ko: "1인·미혼", en: "single" }, married: { ko: "기혼", en: "married" } } as const;
const SEX = { male: { ko: "남성", en: "men" }, female: { ko: "여성", en: "women" } } as const;

// ── Scopes ────────────────────────────────────────────────────────────────

export type GuideOccupation = {
  label: string;
  anchors: PercentileAnchor[];
  usedFallback: boolean;
  // Same occupation/sex, every age bucket — nationwide combos only.
  medianByAge: { ageBand: UsAgeBandId; median: number }[];
};

export type GuideContext = {
  lang: LangCode;
  input: UsInput;
  state: StateMeta | null;
  stateIncome: UsStateIncome | null;
  county: UsCountyIncome | null;
  place: UsPlaceIncome | null;
  countyName: string | null;
  placeName: string | null;
  occupation: GuideOccupation | null;
  extraRows?: GuideExtraRow[];
};

const nationalAnchors = nationalIncomeData.percentileAnchors as PercentileAnchor[];
const ageMedians = new Map<UsAgeBandId, number>(incomeByAgeData.bands.map((b) => [b.id as UsAgeBandId, b.median]));

function contextualScope(
  key: IncomeScopeKey,
  anchors: PercentileAnchor[],
  overallMedian: number | null,
  contextualMedian: number | null,
  placeName: string,
  ctx: GuideContext
): RankScope | null {
  const { lang, input } = ctx;
  if (anchors.length < 2) return null;
  const marital = MARITAL[input.maritalStatus][lang];
  // Same rule as getContextualIncomePercentile -> raw-anchor fallback.
  if (contextualMedian != null && overallMedian != null && contextualMedian > 0) {
    return {
      key,
      anchors,
      scale: overallMedian / contextualMedian,
      median: contextualMedian,
      where: L(lang, `${placeName} ${marital} 가구 중`, `among ${marital} households in ${placeName}`),
      label: L(lang, `${placeName} (${marital} 가구)`, `${placeName} (${marital} households)`),
      note: null,
    };
  }
  return {
    key,
    anchors,
    scale: 1,
    median: overallMedian,
    where: L(lang, `${placeName} 전체 가구 중`, `among all households in ${placeName}`),
    label: L(lang, `${placeName} (전체 가구)`, `${placeName} (all households)`),
    note: L(lang, `${marital} 가구 수치가 없어 전체 가구 기준`, `No ${marital}-household figure published — all households shown`),
  };
}

export type GuideScopes = Partial<Record<IncomeScopeKey, RankScope>>;

export function buildGuideScopes(ctx: GuideContext): GuideScopes {
  const { lang, input, state, stateIncome, county, place } = ctx;
  const scopes: GuideScopes = {};
  const age = ageBandLabel(input.ageBand, lang);

  scopes.national = {
    key: "national",
    anchors: nationalAnchors,
    scale: 1,
    median: nationalMedianHouseholdIncome,
    where: L(lang, "미국 전체 가구 중", "among all US households"),
    label: L(lang, "전국", "Nationwide"),
    note: null,
  };

  const ageMedian = ageMedians.get(input.ageBand);
  if (ageMedian != null && nationalMedianHouseholdIncome != null) {
    scopes.ageIncome = {
      key: "ageIncome",
      anchors: nationalAnchors,
      scale: nationalMedianHouseholdIncome / ageMedian,
      median: ageMedian,
      where: L(lang, `가구주 ${age} 가구 중`, `among householders ${ageWho(input.ageBand, lang)}`),
      label: L(lang, `같은 나이대 (${age})`, `Same age (${age})`),
      note: null,
    };
  }

  if (state && stateIncome && stateIncome.percentileAnchors.length >= 2) {
    const genderMedian = stateIncome.byGender[input.gender];
    if (genderMedian != null && stateIncome.medianHouseholdIncome != null && genderMedian > 0) {
      const sex = SEX[input.gender][lang];
      scopes.gender = {
        key: "gender",
        anchors: stateIncome.percentileAnchors,
        scale: stateIncome.medianHouseholdIncome / genderMedian,
        median: genderMedian,
        where: L(lang, `${state.name} ${sex} 중`, `among ${sex} in ${state.name}`),
        label: L(lang, `같은 성별 (${state.name} ${sex})`, `Same sex (${sex} in ${state.name})`),
        note: L(lang, "개인 중위 근로소득에 맞춘 근사치", "Approximation re-centered on median individual earnings"),
      };
    }
    const s = contextualScope(
      "state",
      stateIncome.percentileAnchors,
      stateIncome.medianHouseholdIncome,
      stateIncome.byMaritalStatus[input.maritalStatus],
      state.name,
      ctx
    );
    if (s) scopes.state = s;
  }

  if (county && ctx.countyName) {
    const ctxMedian = county.byMaritalStatus[input.maritalStatus];
    const c = contextualScope("county", county.percentileAnchors, county.medianHouseholdIncome, ctxMedian, ctx.countyName, ctx);
    if (c) scopes.county = c;

    if (place && ctx.placeName && county.percentileAnchors.length >= 2 && county.medianHouseholdIncome != null && place.medianHouseholdIncome != null) {
      // Mirrors PersonalizedResult's placePercentile: the county curve
      // re-centered on the place's median (scaled to the household type when
      // the county publishes one).
      const placeCtxMedian =
        ctxMedian != null ? (place.medianHouseholdIncome * ctxMedian) / county.medianHouseholdIncome : null;
      const p =
        contextualScope("place", county.percentileAnchors, county.medianHouseholdIncome, placeCtxMedian, ctx.placeName, ctx) ??
        null;
      if (p && placeCtxMedian == null) {
        p.scale = county.medianHouseholdIncome / place.medianHouseholdIncome;
        p.median = place.medianHouseholdIncome;
      }
      if (p) scopes.place = p;
    }
  }

  if (ctx.occupation && ctx.occupation.anchors.length >= 2) {
    const sex = SEX[input.gender][lang];
    const where = ctx.occupation.usedFallback || !state ? L(lang, "전국", "nationwide") : state.name;
    scopes.occupation = {
      key: "occupation",
      anchors: ctx.occupation.anchors,
      scale: 1,
      median: getValueAtPercentile(ctx.occupation.anchors, 50),
      where: L(lang, `${where} ${age} ${sex} ${ctx.occupation.label} 종사자 중`, `among ${ctx.occupation.label} ${sex} ${ageWho(input.ageBand, lang)} (${where})`),
      label: L(lang, `직업: ${ctx.occupation.label}`, `Occupation: ${ctx.occupation.label}`),
      note:
        ctx.occupation.usedFallback && state
          ? L(lang, "표본이 적어 전국 평균 기준", "Small sample — nationwide figures shown")
          : null,
    };
  }

  for (const row of ctx.extraRows ?? []) {
    if (row.anchors.length < 2) continue;
    scopes[row.key] = {
      key: row.key,
      anchors: row.anchors,
      scale: 1,
      median: getValueAtPercentile(row.anchors, 50),
      where: L(lang, `${row.label} 중`, `among ${row.label}`),
      label: row.label,
      note: row.note,
    };
  }
  // A detailed occupation supersedes its own major group's row.
  if (scopes.occupationDetail) delete scopes.occupation;

  return scopes;
}

// ── Sentences ────────────────────────────────────────────────────────────

// Six distance-from-median phrasings, each carrying the real ratio/gap.
export function medianDistancePhrase(income: number, median: number, lang: LangCode): string {
  const r = income / median;
  const pct = Math.round(Math.abs(r - 1) * 100);
  const gap = formatUsd(Math.abs(income - median));
  const x = r.toFixed(1);
  if (r >= 3) return L(lang, `중위값의 약 ${x}배로, 분포의 오른쪽 끝자락입니다`, `about ${x}× the median — well out on the right tail`);
  if (r >= 1.5) return L(lang, `중위값의 ${x}배입니다 (${gap} 많음)`, `${x}× the median (${gap} above it)`);
  if (r >= 1.1) return L(lang, `중위값보다 ${pct}% (${gap}) 높습니다`, `${pct}% (${gap}) above the median`);
  if (r > 0.9) return L(lang, `중위값과 ±10% 안쪽으로, 거의 한가운데입니다`, `within 10% of the median — close to the exact middle`);
  if (r >= 0.6) return L(lang, `중위값보다 ${pct}% (${gap}) 낮습니다`, `${pct}% (${gap}) below the median`);
  return L(lang, `중위값의 ${x}배로, 중위값이 ${gap} 더 높습니다`, `${x}× the median, which sits ${gap} higher`);
}

export function headlineWhere(key: HeadlineKey, scopes: GuideScopes, ctx: GuideContext): string {
  const { lang, input } = ctx;
  if (key === "netWorth") return L(lang, "미국 전체 가구를 순자산으로", "all US households by net worth");
  if (key === "ageNetWorth")
    return L(lang, `가구주 ${ageBandLabel(input.ageBand, lang)} 가구를 순자산으로`, `householders ${ageWho(input.ageBand, lang)} by net worth`);
  return scopes[key]?.where ?? scopes.national!.where;
}

// "Line up 100…" — seven percentile bands, each its own sentence shape.
export function buildGlanceSentence(percent: number, where: string, lang: LangCode): string {
  const n = Math.round(percent);
  const vars = { n, ahead: n - 1, behind: 100 - n, where };
  const ko = [
    "{where} 100명을 한 줄로 세우면 당신은 맨 앞, {n}번째(상위 {n}%)입니다. 뒤로 {behind}명이 서 있습니다.",
    "{where} 100명을 한 줄로 세우면 당신은 {n}번째(상위 {n}%) — 앞에는 {ahead}명뿐이고 뒤로 {behind}명이 있습니다.",
    "{where} 100명 줄에서 당신은 {n}번째(상위 {n}%)로, 앞쪽 10명 안에 듭니다. 뒤로 {behind}명이 있습니다.",
    "{where} 100명 줄에서 당신은 {n}번째(상위 {n}%)로, 앞쪽 4분의 1 구간에 있습니다. 앞에 {ahead}명, 뒤에 {behind}명입니다.",
    "{where} 100명 줄에서 당신은 {n}번째(상위 {n}%)로, 줄의 한가운데보다 앞에 있습니다. 앞에 {ahead}명, 뒤에 {behind}명입니다.",
    "{where} 100명 줄에서 당신은 {n}번째(상위 {n}%)로, 한가운데를 조금 지난 자리입니다. 앞에 {ahead}명, 뒤에 {behind}명입니다.",
    "{where} 100명 줄에서 당신은 {n}번째(상위 {n}%)로, 뒤쪽 4분의 1 구간입니다. 뒤로 {behind}명이 있습니다.",
  ];
  const en = [
    "Line up 100 people {where} and you're at the very front — #{n} (Top {n}%), with {behind} behind you.",
    "Line up 100 people {where} and you're #{n} (Top {n}%) — only {ahead} ahead of you, {behind} behind.",
    "In a line of 100 {where}, you're #{n} (Top {n}%) — inside the first ten, with {behind} behind you.",
    "In a line of 100 {where}, you're #{n} (Top {n}%) — in the front quarter: {ahead} ahead, {behind} behind.",
    "In a line of 100 {where}, you're #{n} (Top {n}%) — ahead of the midpoint: {ahead} ahead, {behind} behind.",
    "In a line of 100 {where}, you're #{n} (Top {n}%) — just past the midpoint: {ahead} ahead, {behind} behind.",
    "In a line of 100 {where}, you're #{n} (Top {n}%) — in the back quarter, with {behind} behind you.",
  ];
  const band = n <= 1 ? 0 : n <= 5 ? 1 : n <= 10 ? 2 : n <= 25 ? 3 : n <= 50 ? 4 : n <= 75 ? 5 : 6;
  return formatTemplate((lang === "ko" ? ko : en)[band], vars);
}

// ── Comparison rows ("Your result") ─────────────────────────────────────

export type ComparisonRow = { key: IncomeScopeKey; label: string; percent: number; median: number | null; ratio: number | null; note: string | null };

export function buildComparisonRows(scopes: GuideScopes, income: number): ComparisonRow[] {
  const order: IncomeScopeKey[] = [
    "national",
    "ageIncome",
    "gender",
    "state",
    "county",
    "place",
    "occupationDetail",
    "occupationDetailState",
    "occupation",
    "education",
    "educationState",
    "educationMajor",
    "experience",
  ];
  return order
    .map((k) => scopes[k])
    .filter((s): s is RankScope => Boolean(s))
    .map((s) => ({
      key: s.key,
      label: s.label,
      percent: scopePercent(s, income),
      median: s.median,
      ratio: s.median ? income / s.median : null,
      note: s.note,
    }));
}

// ── Age curve ─────────────────────────────────────────────────────────────

export type AgeCurve = {
  title: string;
  points: { ageBand: UsAgeBandId; label: string; median: number; mine: boolean }[];
  sentence: string;
  sharedNote: string | null;
};

export function buildAgeCurve(ctx: GuideContext): AgeCurve {
  const { lang, input, occupation } = ctx;
  const useOcc = occupation && occupation.medianByAge.length >= 2 && occupation.medianByAge.some((p) => p.ageBand === input.ageBand);
  const raw = useOcc
    ? occupation!.medianByAge
    : incomeByAgeData.bands.map((b) => ({ ageBand: b.id as UsAgeBandId, median: b.median }));
  const points = raw.map((p) => ({ ...p, label: ageBandLabel(p.ageBand, lang), mine: p.ageBand === input.ageBand }));
  const sex = SEX[input.gender][lang];
  const title = useOcc
    ? L(lang, `${occupation!.label} ${sex}, 나이대별 중위 근로소득 (전국)`, `Median earnings by age — ${occupation!.label}, ${sex} (nationwide)`)
    : L(lang, "가구주 나이대별 중위 가구소득 (전국)", "Median household income by householder age (nationwide)");

  const mine = points.find((p) => p.mine);
  const peak = points.reduce((a, b) => (b.median > a.median ? b : a));
  let sentence = "";
  if (mine) {
    const age = mine.label;
    if (mine.median >= peak.median) {
      sentence = L(
        lang,
        `${age} 구간이 이 곡선의 정점으로, 중위값은 ${formatUsd(mine.median)}입니다.`,
        `Your band (${age}) sits at the peak of this curve, at ${formatUsd(mine.median)}.`
      );
    } else if (points.indexOf(mine) < points.indexOf(peak)) {
      sentence = L(
        lang,
        `중위값은 ${age}의 ${formatUsd(mine.median)}에서 ${peak.label}의 ${formatUsd(peak.median)}까지 올라갑니다.`,
        `Medians climb from ${formatUsd(mine.median)} at ${age} to ${formatUsd(peak.median)} at ${peak.label}.`
      );
    } else {
      sentence = L(
        lang,
        `곡선의 정점은 ${peak.label} (${formatUsd(peak.median)})이고, ${age} 구간의 중위값은 ${formatUsd(mine.median)}입니다.`,
        `The curve peaks at ${peak.label} (${formatUsd(peak.median)}); your band, ${age}, sits at ${formatUsd(mine.median)}.`
      );
    }
  }
  const sharedNote = useOcc
    ? null
    : L(
        lang,
        "Census B19049는 25~44세와 45~64세를 한 구간으로만 발표해, 두 나이대씩 같은 값을 씁니다.",
        "Census table B19049 publishes 25–44 and 45–64 as single brackets, so each pair of bands shares one figure."
      );
  return { title, points, sentence, sharedNote };
}

// ── Caveats ───────────────────────────────────────────────────────────────

export function buildCaveats(ctx: GuideContext, hasOccupation: boolean): string[] {
  const { lang, input } = ctx;
  const marital = MARITAL[input.maritalStatus][lang];
  const hasDetailed = Boolean(ctx.extraRows?.length);
  const lines = [
    L(
      lang,
      `소득 정의: 입력값은 세전 연소득입니다. 지역·나이 비교는 Census 가구소득(가구원 전체의 세전 근로·사업·이자·연금·공적이전 소득 합)을 씁니다.${hasOccupation || hasDetailed ? " 직업·학력·경력 비교만 개인 근로소득(임금+자영업, PERNP, 2020~2024 PUMS) 기준입니다." : ""}`,
      `Income definition: your entry is pre-tax annual income. Location and age comparisons use Census household income (pre-tax wages, self-employment, interest, retirement and public-transfer income of everyone in the household).${hasOccupation || hasDetailed ? " Occupation, education and experience comparisons use personal earnings instead (wages + self-employment, PERNP, 2020–2024 PUMS)." : ""}`
    ),
    L(
      lang,
      `데이터 연도: ACS 5개년 추정치 (${acs5YearRange}). 순자산은 연준 2022 SCF.`,
      `Data years: ACS 5-Year estimates (${acs5YearRange}); net worth from the Federal Reserve's 2022 SCF.`
    ),
    L(
      lang,
      `가구 vs 개인: 한 사람의 소득을 맞벌이 가구가 섞인 분포와 비교하면 순위가 낮게 보일 수 있어, 지역 비교는 ${marital} 가구 중위값에 맞춰 다시 정렬했습니다.`,
      `Household vs. individual: one person's income set against households (some with two earners) can look lower, so location comparisons are re-centered on the ${marital}-household median where it's published.`
    ),
    L(
      lang,
      "표본 오차: ACS는 표본조사라 오차 범위가 있고, 백분위는 발표된 소득 구간 사이를 보간한 값입니다. 작은 지역·세부 조합일수록 몇 %p 차이는 오차 안일 수 있습니다.",
      "Sampling error: the ACS is a survey with margins of error, and percentiles are interpolated between published income brackets — for small areas and narrow combinations, a few points either way is within the noise."
    ),
  ];
  return lines;
}

// ── "What moves you" ─────────────────────────────────────────────────────

export type MilestoneStep = { milestone: number; cutoff: number; gap: number };

// Milestones above the visitor's current percent in this scope, nearest first.
export function buildMilestoneSteps(scope: RankScope, income: number, limit = 3): MilestoneStep[] {
  const current = scopePercent(scope, income);
  return [...GUIDE_MILESTONES]
    .filter((m) => m < current)
    .sort((a, b) => b - a)
    .slice(0, limit)
    .map((m) => {
      const cutoff = Math.ceil(scopeCutoff(scope, m) ?? 0);
      return { milestone: m, cutoff, gap: Math.max(0, cutoff - income) };
    })
    .filter((s) => s.cutoff > 0);
}

export function milestoneSentence(step: MilestoneStep, scope: RankScope, income: number, lang: LangCode): string {
  const pct = Math.round((step.gap / income) * 100);
  return L(
    lang,
    `상위 ${step.milestone}% (${scope.where}) 기준선은 약 ${formatUsd(step.cutoff)} — 현재보다 +${formatUsd(step.gap)} (+${pct}%)`,
    `Top ${step.milestone}% ${scope.where} starts near ${formatUsd(step.cutoff)} — +${formatUsd(step.gap)} (+${pct}%) from today`
  );
}

export function topOneSentence(scope: RankScope, income: number, lang: LangCode): string {
  const cutoff = scopeCutoff(scope, 1) ?? income;
  return L(
    lang,
    `이미 ${scope.where} 상위 1% 구간입니다. 기준선(약 ${formatUsd(cutoff)})보다 ${formatUsd(Math.max(0, income - cutoff))} 높습니다.`,
    `You're already in the Top 1% ${scope.where}; that line sits near ${formatUsd(cutoff)}, ${formatUsd(Math.max(0, income - cutoff))} below you.`
  );
}

export type StateStanding = { name: string; abbr: string; percent: number };

const REAL_STATE_FIPS = new Map(US_STATES.map((s) => [s.fips, s]));

// The visitor's income against every state's own distribution, using the
// same household-type re-centering rule as the state card.
export function buildStateStandings(input: UsInput): { best: StateStanding[]; worst: StateStanding[] } {
  const all: StateStanding[] = [];
  for (const s of getAllStateIncomes()) {
    const meta = REAL_STATE_FIPS.get(s.fips);
    if (!meta || s.percentileAnchors.length < 2) continue;
    const ctxMedian = s.byMaritalStatus[input.maritalStatus];
    const scale =
      ctxMedian != null && s.medianHouseholdIncome != null && ctxMedian > 0 ? s.medianHouseholdIncome / ctxMedian : 1;
    all.push({ name: meta.name, abbr: meta.abbr, percent: scopePercent({ anchors: s.percentileAnchors, scale }, input.annualIncome) });
  }
  all.sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name));
  return { best: all.slice(0, 3), worst: all.slice(-3).reverse() };
}

export function stateSpreadSentence(best: StateStanding[], worst: StateStanding[], income: number, lang: LangCode): string {
  if (best.length === 0 || worst.length === 0) return "";
  const spread = worst[0].percent - best[0].percent;
  return spread <= 3
    ? L(
        lang,
        `${formatUsd(income)}의 순위는 주마다 거의 같습니다 (최대 ${spread}%p 차이).`,
        `${formatUsd(income)} lands in nearly the same place in every state (at most ${spread} points apart).`
      )
    : L(
        lang,
        `같은 ${formatUsd(income)}이 ${best[0].name}에서는 상위 ${best[0].percent}%, ${worst[0].name}에서는 상위 ${worst[0].percent}% — ${spread}%p 차이입니다.`,
        `The same ${formatUsd(income)} ranks Top ${best[0].percent}% in ${best[0].name} but Top ${worst[0].percent}% in ${worst[0].name} — a ${spread}-point spread.`
      );
}

export type NetWorthGuide = { percent: number; where: string; next: MilestoneStep | null; sentence: string };

export function buildNetWorthGuide(ctx: GuideContext): NetWorthGuide | null {
  const { input, lang } = ctx;
  if (input.netWorth == null) return null;
  const band = netWorthByAgeData.bands.find((b) => b.id === input.ageBand);
  if (!band) return null;
  const scope = {
    anchors: netWorthPercentilesUS.percentileAnchors as PercentileAnchor[],
    scale: netWorthScaleForMedian(band.median),
  };
  const nw = Math.max(1, input.netWorth);
  const percent = scopePercent(scope, nw);
  const age = ageBandLabel(input.ageBand, lang);
  const where = L(lang, `가구주 ${age} 가구 중`, `among householders ${ageWho(input.ageBand, lang)}`);
  const nextM = [...GUIDE_MILESTONES].filter((m) => m < percent).sort((a, b) => b - a)[0];
  const cutoff = nextM != null ? scopeCutoff(scope, nextM) : null;
  const next = nextM != null && cutoff != null ? { milestone: nextM, cutoff: Math.ceil(cutoff), gap: Math.max(0, Math.ceil(cutoff) - nw) } : null;
  const sentence = next
    ? L(
        lang,
        `순자산 ${formatUsd(input.netWorth)}은 ${where} 상위 ${percent}%입니다 (이 나이대 중위 ${formatUsd(band.median)}). 다음 구간인 상위 ${next.milestone}%는 약 ${formatUsd(next.cutoff)}부터로, +${formatUsd(next.gap)} 차이입니다.`,
        `A net worth of ${formatUsd(input.netWorth)} ranks Top ${percent}% ${where} (median for the band: ${formatUsd(band.median)}). The next marker, Top ${next.milestone}%, starts near ${formatUsd(next.cutoff)} — +${formatUsd(next.gap)} away.`
      )
    : L(
        lang,
        `순자산 ${formatUsd(input.netWorth)}은 ${where} 상위 ${percent}%로, 추적하는 최상위 구간에 있습니다.`,
        `A net worth of ${formatUsd(input.netWorth)} ranks Top ${percent}% ${where} — already in the highest tracked band.`
      );
  return { percent, where, next, sentence };
}

export function crossedMilestone(fromPercent: number, toPercent: number): number | null {
  const crossed = GUIDE_MILESTONES.filter((m) => toPercent <= m && fromPercent > m);
  return crossed.length > 0 ? Math.min(...crossed) : null;
}
