// 자산(순자산) 순위 계산 — salaryCalc.ts와 같은 방식이지만 data/networth.json을
// 사용한다. 연령대/지역/구/결혼상태는 salaryCalc의 값을 그대로 재사용하고,
// 순자산 전용 평균 테이블만 별도로 둔다.

import networthData from "@/data/networth.json";
import type { Localized } from "@/lib/i18n";
import {
  getPercentileRankFromTable,
  getPercentileRankRelativeTo as getRelativePercentile,
  clampDisplayPercent,
  type PercentileAnchor,
} from "@/lib/percentileTable";
import type { AgeGroupId, MaritalStatusId, RegionId, SeoulDistrictId } from "@/lib/salaryCalc";

export type NetWorthEntry = { id: string; label: Localized; average: number };

export const netWorthAgeGroups = networthData.ageGroups as NetWorthEntry[];
export const netWorthMaritalStatuses = networthData.maritalStatuses as NetWorthEntry[];
export const netWorthRegions = networthData.regions as NetWorthEntry[];
export const netWorthSeoulDistricts = networthData.seoulDistricts as NetWorthEntry[];

export const overallAverageNetWorth = networthData.overall.average;
export const overallMedianNetWorth = networthData.overall.median;

function getById(list: NetWorthEntry[], id: string): NetWorthEntry {
  const found = list.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown net worth category id: ${id}`);
  return found;
}

export const getNetWorthAgeGroup = (id: AgeGroupId) => getById(netWorthAgeGroups, id);
export const getNetWorthMaritalStatus = (id: MaritalStatusId) => getById(netWorthMaritalStatuses, id);
export const getNetWorthRegion = (id: RegionId) => getById(netWorthRegions, id);
export const getNetWorthSeoulDistrict = (id: SeoulDistrictId) => getById(netWorthSeoulDistricts, id);

const percentileTable: PercentileAnchor[] = networthData.percentiles.map((p) => ({
  topPercent: p.topPercent,
  value: p.minNetWorth,
}));

export function getNetWorthPercentileRank(netWorth: number): number {
  return getPercentileRankFromTable(percentileTable, netWorth);
}

export function getNetWorthPercentileRankRelativeTo(subgroupAverage: number, netWorth: number): number {
  return getRelativePercentile(percentileTable, overallAverageNetWorth, subgroupAverage, netWorth);
}

export type NetWorthGroupComparison = {
  ageGroup: number;
  region: number;
  district: number | null;
  maritalStatus: number;
};

export type NetWorthInput = {
  ageGroup: AgeGroupId;
  maritalStatus: MaritalStatusId;
  region: RegionId;
  district: SeoulDistrictId | null;
  netWorth: number; // 사용자가 직접 입력한 순자산, 만원 단위
};

export function computeNetWorthGroupComparisons(input: NetWorthInput): NetWorthGroupComparison {
  const regionAvg =
    input.region === "seoul" && input.district
      ? getNetWorthSeoulDistrict(input.district).average
      : getNetWorthRegion(input.region).average;

  return {
    ageGroup: clampDisplayPercent(
      getNetWorthPercentileRankRelativeTo(getNetWorthAgeGroup(input.ageGroup).average, input.netWorth)
    ),
    region: clampDisplayPercent(
      getNetWorthPercentileRankRelativeTo(getNetWorthRegion(input.region).average, input.netWorth)
    ),
    district:
      input.region === "seoul" && input.district
        ? clampDisplayPercent(getNetWorthPercentileRankRelativeTo(regionAvg, input.netWorth))
        : null,
    maritalStatus: clampDisplayPercent(
      getNetWorthPercentileRankRelativeTo(getNetWorthMaritalStatus(input.maritalStatus).average, input.netWorth)
    ),
  };
}

export type NetWorthRankResult = {
  netWorth: number; // 만원
  percentile: number;
  percentileRounded: number;
  vsOverallAverage: number;
  groupComparisons: NetWorthGroupComparison;
};

export function computeNetWorthRank(input: NetWorthInput): NetWorthRankResult {
  const percentile = Math.round(getNetWorthPercentileRank(input.netWorth) * 10) / 10;
  const percentileRounded = clampDisplayPercent(percentile);

  return {
    netWorth: input.netWorth,
    percentile,
    percentileRounded,
    vsOverallAverage: input.netWorth / overallAverageNetWorth,
    groupComparisons: computeNetWorthGroupComparisons(input),
  };
}
