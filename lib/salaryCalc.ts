// 연봉 순위 계산 — 사용자가 직접 입력한 실제 연봉을 data/salary.json에 내장된
// 통계청 기준 근사 데이터와 대조해 전부 클라이언트에서 계산한다. API 호출 없음.
//
// 이전 버전과 다른 점: 예전에는 연령대/성별/기업규모/산업/지역 평균으로 연봉을
// "추정"했지만, 이제는 사용자가 실제 연봉을 입력하므로 카테고리 평균은 오직
// "동일 집단에서는 상위 몇 %?" 비교용으로만 쓰인다.
//
// 백분위 계산 로직은 lib/percentileTable.ts로 분리해 자산(net worth) 계산과
// 공유한다.

import salaryData from "@/data/salary.json";
import type { Localized } from "@/lib/i18n";
import {
  getPercentileRankFromTable,
  getPercentileRankRelativeTo as getRelativePercentile,
  clampDisplayPercent,
  type PercentileAnchor,
} from "@/lib/percentileTable";

export type CategoryEntry = { id: string; label: Localized; average: number };

export type AgeGroupId = "20s" | "30s" | "40s" | "50s" | "60s";
export type GenderId = "male" | "female";
export type MaritalStatusId = "single" | "married";
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

export type RegionId =
  | "seoul"
  | "sejong"
  | "ulsan"
  | "gyeonggi"
  | "daejeon"
  | "incheon"
  | "chungnam"
  | "busan"
  | "gwangju"
  | "chungbuk"
  | "gyeongnam"
  | "daegu"
  | "jeju"
  | "gangwon"
  | "gyeongbuk"
  | "jeonbuk"
  | "jeonnam";

// 서울을 선택했을 때만 활성화되는 구 단위 세부 지역. 다른 시/도는 현재
// 시/도 단위까지만 지원한다(전국 250여개 시군구를 신뢰도 있게 다 채우기 어려워
// 서울을 예시 삼아 먼저 구현했다).
export type SeoulDistrictId =
  | "gangnam"
  | "seocho"
  | "songpa"
  | "yongsan"
  | "jongno"
  | "jung"
  | "mapo"
  | "seongdong"
  | "yeongdeungpo"
  | "gwangjin"
  | "gangdong"
  | "yangcheon"
  | "dongjak"
  | "gangseo"
  | "seodaemun"
  | "seongbuk"
  | "eunpyeong"
  | "gwanak"
  | "guro"
  | "dongdaemun"
  | "geumcheon"
  | "jungnang"
  | "nowon"
  | "dobong"
  | "gangbuk";

export const ageGroups = salaryData.ageGroups as CategoryEntry[];
export const genders = salaryData.genders as CategoryEntry[];
export const maritalStatuses = salaryData.maritalStatuses as CategoryEntry[];
export const companySizes = salaryData.companySizes as CategoryEntry[];
export const industries = salaryData.industries as CategoryEntry[];
export const regions = salaryData.regions as CategoryEntry[];
export const seoulDistricts = salaryData.seoulDistricts as CategoryEntry[];

export const overallAverage = salaryData.overall.average;
export const overallMedian = salaryData.overall.median;

function getById(list: CategoryEntry[], id: string): CategoryEntry {
  const found = list.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown category id: ${id}`);
  return found;
}

export const getAgeGroup = (id: AgeGroupId) => getById(ageGroups, id);
export const getGender = (id: GenderId) => getById(genders, id);
export const getMaritalStatus = (id: MaritalStatusId) => getById(maritalStatuses, id);
export const getCompanySize = (id: CompanySizeId) => getById(companySizes, id);
export const getIndustry = (id: IndustryId) => getById(industries, id);
export const getRegion = (id: RegionId) => getById(regions, id);
export const getSeoulDistrict = (id: SeoulDistrictId) => getById(seoulDistricts, id);

export type SalaryInput = {
  ageGroup: AgeGroupId;
  gender: GenderId;
  maritalStatus: MaritalStatusId;
  companySize: CompanySizeId;
  industry: IndustryId;
  region: RegionId;
  district: SeoulDistrictId | null; // region이 "seoul"일 때만 값이 있을 수 있음
  annualSalary: number; // 사용자가 직접 입력한 실제 연봉, 만원 단위
};

// URL 쿼리스트링에 담기 위한 컴팩트 인코딩 — district가 없으면 "-"로 채운다.
export function encodeSalaryInput(input: SalaryInput): string {
  return [
    input.ageGroup,
    input.gender,
    input.maritalStatus,
    input.companySize,
    input.industry,
    input.region,
    input.district ?? "-",
    String(input.annualSalary),
  ].join(".");
}

function hasId(list: CategoryEntry[], id: string): boolean {
  return list.some((entry) => entry.id === id);
}

export function decodeSalaryInput(raw: string): SalaryInput | null {
  const parts = raw.split(".");
  if (parts.length !== 8) return null;
  const [ageGroup, gender, maritalStatus, companySize, industry, region, district, annualSalaryRaw] = parts;

  const annualSalary = Number(annualSalaryRaw);
  if (
    !hasId(ageGroups, ageGroup) ||
    !hasId(genders, gender) ||
    !hasId(maritalStatuses, maritalStatus) ||
    !hasId(companySizes, companySize) ||
    !hasId(industries, industry) ||
    !hasId(regions, region) ||
    (district !== "-" && !hasId(seoulDistricts, district)) ||
    !Number.isFinite(annualSalary) ||
    annualSalary <= 0
  ) {
    return null;
  }

  return {
    ageGroup: ageGroup as AgeGroupId,
    gender: gender as GenderId,
    maritalStatus: maritalStatus as MaritalStatusId,
    companySize: companySize as CompanySizeId,
    industry: industry as IndustryId,
    region: region as RegionId,
    district: district === "-" ? null : (district as SeoulDistrictId),
    annualSalary,
  };
}

const percentileTable: PercentileAnchor[] = salaryData.percentiles.map((p) => ({
  topPercent: p.topPercent,
  value: p.minSalary,
}));

export function getPercentileRank(monthlySalary: number): number {
  return getPercentileRankFromTable(percentileTable, monthlySalary);
}

export function getPercentileRankRelativeTo(subgroupAverage: number, monthlySalary: number): number {
  return getRelativePercentile(percentileTable, overallAverage, subgroupAverage, monthlySalary);
}

export type GroupComparison = {
  ageGroup: number;
  industry: number;
  region: number;
  district: number | null;
  maritalStatus: number;
};

export function computeGroupComparisons(input: SalaryInput, monthlySalary: number): GroupComparison {
  const regionAvg =
    input.region === "seoul" && input.district
      ? getSeoulDistrict(input.district).average
      : getRegion(input.region).average;

  return {
    ageGroup: clampDisplayPercent(getPercentileRankRelativeTo(getAgeGroup(input.ageGroup).average, monthlySalary)),
    industry: clampDisplayPercent(getPercentileRankRelativeTo(getIndustry(input.industry).average, monthlySalary)),
    region: clampDisplayPercent(getPercentileRankRelativeTo(getRegion(input.region).average, monthlySalary)),
    district:
      input.region === "seoul" && input.district
        ? clampDisplayPercent(getPercentileRankRelativeTo(regionAvg, monthlySalary))
        : null,
    maritalStatus: clampDisplayPercent(
      getPercentileRankRelativeTo(getMaritalStatus(input.maritalStatus).average, monthlySalary)
    ),
  };
}

export type SalaryRankResult = {
  monthly: number; // 만원
  annual: number; // 만원
  percentile: number; // 상위 %, 소수 1자리
  percentileRounded: number; // 표시용, 정수 1~99로 클램프
  vsOverallAverage: number; // 실제 연봉 / 전체 평균 비율
  groupComparisons: GroupComparison;
};

export function computeSalaryRank(input: SalaryInput): SalaryRankResult {
  const monthly = Math.round(input.annualSalary / 12);
  const percentile = Math.round(getPercentileRank(monthly) * 10) / 10;
  const percentileRounded = clampDisplayPercent(percentile);

  return {
    monthly,
    annual: input.annualSalary,
    percentile,
    percentileRounded,
    vsOverallAverage: monthly / overallAverage,
    groupComparisons: computeGroupComparisons(input, monthly),
  };
}
