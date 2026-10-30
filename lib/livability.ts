// Scores for /us/where-to-live — pure functions over one area's published
// inputs (public/data/livability.json, built by scripts/build-livability.ts)
// and a pre-tax income. Every constant lives in lib/livabilityConstants.ts.
//
// Grades describe how much room the visitor's income has in an area — never
// the area itself — and carry no letters, so they can't be confused with the
// income-rank grades (S, A+, …) used elsewhere on the site.
import { LIVABILITY_CONSTANTS as C } from "@/lib/livabilityConstants";

export type Bedrooms = 1 | 2 | 3;
export type GradeId = (typeof C.grades)[number]["id"];

export type LivabilityArea = {
  id: string;
  slug: string;
  type: "metro" | "state";
  name: string;
  states: string[];
  rpp: number;
  rent: { "1": number | null; "2": number | null; "3": number | null };
  homeValue: number | null;
  medHhIncome: number | null;
  flags: string[];
};

export type LivabilitySource = { agency: string; table: string; year: number | string; released?: string; url: string; downloadedAt: string };
export type LivabilityData = {
  meta: {
    generatedAt: string;
    sources: LivabilitySource[];
    vintages: { rpp: number; rppReleased: string; acs5: string };
    counts: { states: number; metros: number };
  };
  areas: LivabilityArea[];
};

export type AreaScore = {
  area: LivabilityArea;
  rent: number;
  rentBurden: number;
  priceToIncome: number;
  feelsLike: number;
  rentScore: number;
  buyScore: number;
  powerScore: number;
  living: number;
  grade: GradeId;
};

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const line = (v: number, best: number, worst: number) => clamp((100 * (worst - v)) / (worst - best));
const logLine = (v: number, best: number, worst: number) => clamp((100 * Math.log(worst / v)) / Math.log(worst / best));
const ratioLine = C.scale === "log" ? logLine : line;

export function gradeFor(living: number): GradeId {
  return (C.grades.find((g) => living >= g.min) ?? C.grades[C.grades.length - 1]).id;
}

// null when the area lacks a value the score needs (an ACS "n/a").
export function scoreArea(area: LivabilityArea, income: number, bedrooms: Bedrooms): AreaScore | null {
  const rent = area.rent[String(bedrooms) as "1" | "2" | "3"];
  if (rent == null || area.homeValue == null || !(income > 0)) return null;
  const rentBurden = (rent * 12) / income;
  const priceToIncome = area.homeValue / income;
  const rentScore = ratioLine(rentBurden, C.rent.best, C.rent.worst);
  const buyScore = ratioLine(priceToIncome, C.buy.best, C.buy.worst);
  const powerScore = line(area.rpp, C.power.best, C.power.worst);
  const living = C.weights.rent * rentScore + C.weights.buy * buyScore + C.weights.power * powerScore;
  return {
    area,
    rent,
    rentBurden,
    priceToIncome,
    feelsLike: (income * 100) / area.rpp,
    rentScore,
    buyScore,
    powerScore,
    living,
    grade: gradeFor(living),
  };
}

export function scoreAll(areas: LivabilityArea[], income: number, bedrooms: Bedrooms): AreaScore[] {
  const out: AreaScore[] = [];
  for (const a of areas) {
    const s = scoreArea(a, income, bedrooms);
    if (s) out.push(s);
  }
  // Best first; ties broken by name so the order never jitters.
  return out.sort((a, b) => b.living - a.living || a.area.name.localeCompare(b.area.name));
}

export const GRADE_ORDER: GradeId[] = C.grades.map((g) => g.id);

export function gradeDistribution(scores: AreaScore[]): Record<GradeId, number> {
  const counts = Object.fromEntries(GRADE_ORDER.map((g) => [g, 0])) as Record<GradeId, number>;
  for (const s of scores) counts[s.grade]++;
  return counts;
}

// Share (0–100) of areas where this income is Comfortable or better.
export function comfortableOrBetterPercent(scores: AreaScore[]): number {
  if (!scores.length) return 0;
  const n = scores.filter((s) => s.grade === "royal" || s.grade === "comfortable").length;
  return Math.round((n / scores.length) * 100);
}

// One-line, number-driven reading of a row: the wording follows the values.
export function areaSummary(s: AreaScore, lang: "en" | "ko" = "en"): string {
  const r = Math.round(s.rentBurden * 100);
  const p = s.priceToIncome.toFixed(1);
  const ko = lang === "ko";
  const rentPart =
    r <= 15
      ? ko ? `월세는 소득의 ${r}%로 아주 가벼운 편` : `rent takes just ${r}% of income`
      : r < 30
        ? ko ? `월세가 소득의 ${r}%` : `rent is ${r}% of income`
        : r < 50
          ? ko ? `월세가 소득의 ${r}%로 HUD 부담 기준(30%)을 넘음` : `rent is ${r}% of income, past HUD's 30% burden line`
          : ko ? `월세만으로 소득의 ${r}%` : `rent alone would take ${r}% of income`;
  const buyPart =
    s.priceToIncome <= 3
      ? ko ? `중위 주택 가격은 소득의 ${p}배` : `the median home is ${p}× income`
      : s.priceToIncome <= 6
        ? ko ? `중위 주택은 소득의 ${p}배` : `the median home costs ${p}× income`
        : ko ? `중위 주택은 소득의 ${p}배로 멀리 있음` : `the median home is a stretch at ${p}× income`;
  return ko ? `${rentPart}, ${buyPart}` : `${rentPart[0].toUpperCase()}${rentPart.slice(1)}; ${buyPart}`;
}
