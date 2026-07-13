// 연봉 순위 계산 — data/salary.json에 내장된 통계청 기준 근사 데이터만으로 전부
// 클라이언트에서 계산한다. API 호출 없음.
//
// 추정 로직: 각 카테고리(연령대/성별/기업규모/산업/지역) 평균을 전체 평균 대비
// 비율로 바꾼 뒤, 그 비율들의 로그를 평균(=기하평균)해서 한 번만 적용한다.
// 5개 비율을 그대로 곱하면 극단적인 카테고리가 겹칠 때 추정치가 비현실적으로
// 튀기 때문에, 로그 평균으로 "여러 신호의 평균적인 보정"만 반영하는 방식을 쓴다.
//
// 백분위 계산: data/salary.json의 percentiles는 "상위 X%에 들기 위한 최소 월소득"
// 경계값 표다. 소득 분포는 로그정규분포에 가까운 형태라 로그-로그 공간에서
// 선형보간(및 양끝 구간 바깥은 같은 직선으로 외삽)하면 완만하게 이어지는 백분위를
// 얻을 수 있다.

import salaryData from "@/data/salary.json";
import type { Localized } from "@/lib/i18n";

export type CategoryEntry = { id: string; label: Localized; average: number };

export type AgeGroupId = "20s" | "30s" | "40s" | "50s" | "60s";
export type GenderId = "male" | "female";
export type CompanySizeId = "large" | "sme" | "nonprofit";
export type IndustryId =
  | "finance"
  | "utilities"
  | "ict"
  | "professional"
  | "manufacturing"
  | "construction"
  | "transport"
  | "realestate"
  | "wholesale"
  | "education"
  | "health"
  | "arts"
  | "business_support"
  | "accommodation";
export type RegionId = "seoul" | "gyeonggi_incheon" | "metro" | "other";

export const ageGroups = salaryData.ageGroups as CategoryEntry[];
export const genders = salaryData.genders as CategoryEntry[];
export const companySizes = salaryData.companySizes as CategoryEntry[];
export const industries = salaryData.industries as CategoryEntry[];
export const regions = salaryData.regions as CategoryEntry[];

export const overallAverage = salaryData.overall.average;
export const overallMedian = salaryData.overall.median;

function getById(list: CategoryEntry[], id: string): CategoryEntry {
  const found = list.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown category id: ${id}`);
  return found;
}

export const getAgeGroup = (id: AgeGroupId) => getById(ageGroups, id);
export const getGender = (id: GenderId) => getById(genders, id);
export const getCompanySize = (id: CompanySizeId) => getById(companySizes, id);
export const getIndustry = (id: IndustryId) => getById(industries, id);
export const getRegion = (id: RegionId) => getById(regions, id);

export type SalaryInput = {
  ageGroup: AgeGroupId;
  gender: GenderId;
  companySize: CompanySizeId;
  industry: IndustryId;
  region: RegionId;
};

// URL 쿼리스트링에 담기 위한 컴팩트 인코딩 — data/results.ts의 encodeBreakdown과
// 같은 목적(공유 가능한 짧은 링크)이지만 salary는 5개의 고정 id만 있어 join으로 충분하다.
export function encodeSalaryInput(input: SalaryInput): string {
  return [input.ageGroup, input.gender, input.companySize, input.industry, input.region].join(".");
}

function hasId(list: CategoryEntry[], id: string): boolean {
  return list.some((entry) => entry.id === id);
}

export function decodeSalaryInput(raw: string): SalaryInput | null {
  const parts = raw.split(".");
  if (parts.length !== 5) return null;
  const [ageGroup, gender, companySize, industry, region] = parts;

  if (
    !hasId(ageGroups, ageGroup) ||
    !hasId(genders, gender) ||
    !hasId(companySizes, companySize) ||
    !hasId(industries, industry) ||
    !hasId(regions, region)
  ) {
    return null;
  }

  return {
    ageGroup: ageGroup as AgeGroupId,
    gender: gender as GenderId,
    companySize: companySize as CompanySizeId,
    industry: industry as IndustryId,
    region: region as RegionId,
  };
}

// 추정치 위아래로 얼마나 폭을 줄지 (±15%). 카테고리별 분산 데이터가 없어
// 고정 스프레드로 "구간"을 만든다.
const RANGE_SPREAD = 0.15;

// 추정 범위를 벗어나는 극단값에서 백분위가 무한히 커지거나 0에 가까워지는 걸
// 막기 위한 표시용 클램프.
const MIN_PERCENT = 0.1;
const MAX_PERCENT = 99.9;

// 카테고리 평균들을 전체 평균 대비 비율로 바꾼 뒤 기하평균(로그 평균)으로
// 합성해 월 소득 추정치를 만든다.
export function estimateMonthlySalary(input: SalaryInput): number {
  const ratios = [
    getAgeGroup(input.ageGroup).average / overallAverage,
    getGender(input.gender).average / overallAverage,
    getCompanySize(input.companySize).average / overallAverage,
    getIndustry(input.industry).average / overallAverage,
    getRegion(input.region).average / overallAverage,
  ];

  const meanLogRatio = ratios.reduce((sum, ratio) => sum + Math.log(ratio), 0) / ratios.length;
  return overallAverage * Math.exp(meanLogRatio);
}

type PercentileAnchor = { topPercent: number; minSalary: number };

const percentileTable: PercentileAnchor[] = salaryData.percentiles;

// log-log 공간에서 (salaryA, percentA) -> (salaryB, percentB)를 잇는 직선 위에서
// salary에 대응하는 percent를 구한다. salary가 구간 밖이어도 같은 직선으로 외삽한다.
function interpolatePercent(a: PercentileAnchor, b: PercentileAnchor, salary: number): number {
  const logA = Math.log(a.minSalary);
  const logB = Math.log(b.minSalary);
  const t = (Math.log(salary) - logA) / (logB - logA);
  const logPercentA = Math.log(a.topPercent);
  const logPercentB = Math.log(b.topPercent);
  return Math.exp(logPercentA + t * (logPercentB - logPercentA));
}

// 월 소득(만원)을 받아 "상위 몇 %"에 해당하는지 반환한다 (1 = 상위 1%, 100 = 최하위권).
export function getPercentileRank(monthlySalary: number): number {
  if (monthlySalary <= 0) return MAX_PERCENT;

  const top = percentileTable[0];
  const bottom = percentileTable[percentileTable.length - 1];

  let percent: number;
  if (monthlySalary >= top.minSalary) {
    percent = interpolatePercent(top, percentileTable[1], monthlySalary);
  } else if (monthlySalary <= bottom.minSalary) {
    percent = interpolatePercent(percentileTable[percentileTable.length - 2], bottom, monthlySalary);
  } else {
    const upperIndex = percentileTable.findIndex((anchor, i) => {
      const next = percentileTable[i + 1];
      return next && monthlySalary <= anchor.minSalary && monthlySalary >= next.minSalary;
    });
    percent = interpolatePercent(percentileTable[upperIndex], percentileTable[upperIndex + 1], monthlySalary);
  }

  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, percent));
}

export type SalaryRange = { min: number; estimate: number; max: number };

export type GroupComparison = { ageGroup: number; industry: number; region: number };

function clampDisplayPercent(percent: number): number {
  return Math.min(99, Math.max(1, Math.round(percent)));
}

// "동일 연령대/직종/지역에서는 상위 몇 %?" — 해당 그룹 평균 대비로 소득을 다시
// 스케일링한 뒤 같은 전체 백분위표에 대조한다. 그룹별 분포 데이터가 없어서 전체
// 분포와 같은 모양(로그정규 형태)을 하고 있고 평균만 다르다고 가정하는 근사치다.
export function getPercentileRankRelativeTo(subgroupAverage: number, monthlySalary: number): number {
  const rescaled = monthlySalary * (overallAverage / subgroupAverage);
  return getPercentileRank(rescaled);
}

export function computeGroupComparisons(input: SalaryInput, monthlyEstimate: number): GroupComparison {
  return {
    ageGroup: clampDisplayPercent(getPercentileRankRelativeTo(getAgeGroup(input.ageGroup).average, monthlyEstimate)),
    industry: clampDisplayPercent(getPercentileRankRelativeTo(getIndustry(input.industry).average, monthlyEstimate)),
    region: clampDisplayPercent(getPercentileRankRelativeTo(getRegion(input.region).average, monthlyEstimate)),
  };
}

export type SalaryRankResult = {
  monthly: SalaryRange; // 만원
  annual: SalaryRange; // 만원
  percentile: number; // 상위 %, 소수 1자리
  percentileRounded: number; // 표시용, 정수 1~99로 클램프
  vsOverallAverage: number; // estimate / overallAverage 비율
  groupComparisons: GroupComparison; // 동일 연령대/직종/지역 내에서의 상위 % (정수 1~99)
};

export function computeSalaryRank(input: SalaryInput): SalaryRankResult {
  const monthlyEstimate = estimateMonthlySalary(input);
  const monthly: SalaryRange = {
    min: Math.round(monthlyEstimate * (1 - RANGE_SPREAD)),
    estimate: Math.round(monthlyEstimate),
    max: Math.round(monthlyEstimate * (1 + RANGE_SPREAD)),
  };
  const annual: SalaryRange = {
    min: monthly.min * 12,
    estimate: monthly.estimate * 12,
    max: monthly.max * 12,
  };

  const percentile = Math.round(getPercentileRank(monthlyEstimate) * 10) / 10;
  const percentileRounded = clampDisplayPercent(percentile);

  return {
    monthly,
    annual,
    percentile,
    percentileRounded,
    vsOverallAverage: monthlyEstimate / overallAverage,
    groupComparisons: computeGroupComparisons(input, monthlyEstimate),
  };
}
