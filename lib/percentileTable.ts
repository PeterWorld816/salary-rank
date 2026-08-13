// 소득/자산 공용 백분위 계산 — lib/salaryCalc.ts에 있던 log-log 보간 로직을
// 값(value) 컬럼 이름만 다른 두 테이블(소득: minSalary, 자산: minNetWorth)에
// 동일하게 적용할 수 있도록 일반화했다.
//
// 백분위 계산: "상위 X%에 들기 위한 최소 값" 경계값 표를 받아, 소득/자산 분포가
// 로그정규분포에 가까운 형태라는 가정 하에 log-log 공간에서 선형보간(및 양끝
// 구간 바깥은 같은 직선으로 외삽)해서 완만하게 이어지는 백분위를 만든다.

export type PercentileAnchor = { topPercent: number; value: number };

export const MIN_PERCENT = 0.1;
export const MAX_PERCENT = 99.9;

function interpolatePercent(a: PercentileAnchor, b: PercentileAnchor, value: number): number {
  const logA = Math.log(a.value);
  const logB = Math.log(b.value);
  const t = (Math.log(value) - logA) / (logB - logA);
  const logPercentA = Math.log(a.topPercent);
  const logPercentB = Math.log(b.topPercent);
  return Math.exp(logPercentA + t * (logPercentB - logPercentA));
}

// value를 받아 "상위 몇 %"에 해당하는지 반환한다 (1 = 상위 1%, 100 = 최하위권).
export function getPercentileRankFromTable(table: PercentileAnchor[], value: number): number {
  if (value <= 0) return MAX_PERCENT;

  const top = table[0];
  const bottom = table[table.length - 1];

  let percent: number;
  if (value >= top.value) {
    percent = interpolatePercent(top, table[1], value);
  } else if (value <= bottom.value) {
    percent = interpolatePercent(table[table.length - 2], bottom, value);
  } else {
    const upperIndex = table.findIndex((anchor, i) => {
      const next = table[i + 1];
      return next && value <= anchor.value && value >= next.value;
    });
    percent = interpolatePercent(table[upperIndex], table[upperIndex + 1], value);
  }

  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, percent));
}

export function clampDisplayPercent(percent: number): number {
  return Math.min(99, Math.max(1, Math.round(percent)));
}

function interpolateValue(a: PercentileAnchor, b: PercentileAnchor, topPercent: number): number {
  const logPercentA = Math.log(a.topPercent);
  const logPercentB = Math.log(b.topPercent);
  const t = (Math.log(topPercent) - logPercentA) / (logPercentB - logPercentA);
  const logValueA = Math.log(a.value);
  const logValueB = Math.log(b.value);
  return Math.exp(logValueA + t * (logValueB - logValueA));
}

// Inverse of getPercentileRankFromTable: given "top X%", returns the income/net-worth
// value at that boundary (e.g. "what do you need to earn to be in the top 10% here?").
// Same log-log interpolation curve, just solved the other direction.
export function getValueAtPercentile(table: PercentileAnchor[], topPercent: number): number | null {
  if (table.length < 2) return null;
  const clamped = Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, topPercent));

  const top = table[0];
  const bottom = table[table.length - 1];

  if (clamped <= top.topPercent) {
    return interpolateValue(top, table[1], clamped);
  }
  if (clamped >= bottom.topPercent) {
    return interpolateValue(table[table.length - 2], bottom, clamped);
  }

  const upperIndex = table.findIndex((anchor, i) => {
    const next = table[i + 1];
    return next && clamped >= anchor.topPercent && clamped <= next.topPercent;
  });
  return interpolateValue(table[upperIndex], table[upperIndex + 1], clamped);
}

// "Top X%" milestone the user hasn't reached yet, and how much more value
// they'd need to get there — table is sorted ascending by topPercent /
// descending by value (see the type comment above), so the anchors whose
// value beats `currentValue` are exactly the ones the user hasn't cleared;
// the smallest of those (last one in that filtered slice) is the nearest
// milestone, not the most extreme one. Returns null once currentValue is
// already at or above the best-tracked anchor (table[0]) — there's no
// further milestone in this table to report.
export type PercentileGap = { nextTierPercent: number; amountNeeded: number };

export function getNextPercentileGap(table: PercentileAnchor[], currentValue: number): PercentileGap | null {
  const above = table.filter((anchor) => anchor.value > currentValue);
  if (above.length === 0) return null;
  const next = above[above.length - 1];
  return { nextTierPercent: next.topPercent, amountNeeded: next.value - currentValue };
}

// 같은 분포 모양(로그정규 형태)을 하고 평균만 다르다고 가정하고, 그룹 평균 대비로
// value를 다시 스케일링한 뒤 같은 전체 백분위표에 대조한다 — "동일 연령대/직종/
// 지역/결혼상태에서는 상위 몇 %?"를 구하는 근사 방법.
export function getPercentileRankRelativeTo(
  table: PercentileAnchor[],
  overallAverage: number,
  subgroupAverage: number,
  value: number
): number {
  const rescaled = value * (overallAverage / subgroupAverage);
  return getPercentileRankFromTable(table, rescaled);
}

// "Roughly how many people share this income bracket" — finds the real
// Census-published bracket `value` falls into (the same two neighboring
// anchors getPercentileRankFromTable would interpolate between) and returns
// what share of `totalPopulation` that bracket's topPercent span represents.
// Deliberately the actual published bracket, not an arbitrary "±N
// percentage points around you" — every number here still traces back to
// the same anchor table the rest of this app already uses, nothing invented.
export function estimateBandPopulation(table: PercentileAnchor[], value: number, totalPopulation: number): number {
  if (table.length < 2) return 0;

  const top = table[0];
  const bottom = table[table.length - 1];

  let a: PercentileAnchor;
  let b: PercentileAnchor;
  if (value >= top.value) {
    [a, b] = [top, table[1]];
  } else if (value <= bottom.value) {
    [a, b] = [table[table.length - 2], bottom];
  } else {
    const upperIndex = table.findIndex((anchor, i) => {
      const next = table[i + 1];
      return next && value <= anchor.value && value >= next.value;
    });
    [a, b] = [table[upperIndex], table[upperIndex + 1]];
  }

  const spanPercent = Math.abs(b.topPercent - a.topPercent);
  return Math.round(totalPopulation * (spanPercent / 100));
}
