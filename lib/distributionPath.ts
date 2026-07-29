// 소득 분포 곡선의 SVG geometry — lib/brainPath.ts와 같은 역할(순수 좌표 계산)이다.
// 실제 통계청 분포를 그대로 그리는 게 아니라, 오른쪽으로 긴 꼬리를 가진 소득분포의
// "생김새"만 재현하는 매끄러운 단봉 곡선(베타분포 꼴 t^a * (1-t)^b)이다. 정확한
// 밀도가 아니라 "소수가 훨씬 많이 번다"는 비대칭 모양이 핵심.
//
// 사용자의 위치(마커)는 이 곡선 모양과 무관하게, 월소득을 로그 스케일로
// [CHART_MIN_SALARY, CHART_MAX_SALARY] 구간에 매핑해서 정한다 — lib/salaryCalc.ts의
// 백분위 앵커(201~1500만원)를 감싸는 여유 있는 구간이라 대부분의 케이스가 양 끝에
// 눌리지 않고 곡선 위 자연스러운 위치에 찍힌다.

export const CHART_VIEWBOX_W = 320;
export const CHART_VIEWBOX_H = 150;
export const CHART_PAD_X = 10;
export const CHART_BASELINE_Y = 116;
export const CHART_PEAK_HEIGHT = 82;

const SAMPLE_COUNT = 72;
const SHAPE_A = 1.6; // 왼쪽 상승 기울기
const SHAPE_B = 3.6; // 오른쪽 꼬리 감쇠

function bump(t: number): number {
  return Math.pow(t, SHAPE_A) * Math.pow(1 - t, SHAPE_B);
}

let bumpPeakCache: number | null = null;
function bumpPeak(): number {
  if (bumpPeakCache !== null) return bumpPeakCache;
  let max = 0;
  for (let i = 1; i < 400; i++) max = Math.max(max, bump(i / 400));
  bumpPeakCache = max;
  return max;
}

function curveX(t: number): number {
  return CHART_PAD_X + t * (CHART_VIEWBOX_W - CHART_PAD_X * 2);
}

function curveY(t: number): number {
  return CHART_BASELINE_Y - (bump(t) / bumpPeak()) * CHART_PEAK_HEIGHT;
}

export type ChartPoint = { x: number; y: number };

export function buildDistributionPaths(): { linePath: string; areaPath: string } {
  const points: ChartPoint[] = [];
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const t = i / SAMPLE_COUNT;
    points.push({ x: curveX(t), y: curveY(t) });
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = `${linePath} L ${last.x.toFixed(2)},${CHART_BASELINE_Y} L ${first.x.toFixed(2)},${CHART_BASELINE_Y} Z`;

  return { linePath, areaPath };
}

// 곡선이 그려지는 소득 축의 범위(만원/월). 백분위 앵커(201~1500)보다 여유를 둬서
// 마커가 그래프 양 끝에 바짝 붙지 않게 한다.
export const CHART_MIN_SALARY = 150;
export const CHART_MAX_SALARY = 2200;

// 자산 분포 차트용 범위(만원). 순자산 백분위 앵커(500~300000)보다 여유를 둔다.
export const CHART_MIN_NETWORTH = 300;
export const CHART_MAX_NETWORTH = 400000;

function valueToT(value: number, min: number, max: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  return (Math.log(clamped) - Math.log(min)) / (Math.log(max) - Math.log(min));
}

export function markerPosition(
  value: number,
  min: number = CHART_MIN_SALARY,
  max: number = CHART_MAX_SALARY
): ChartPoint {
  const t = valueToT(value, min, max);
  return { x: curveX(t), y: curveY(t) };
}

export function averageTickX(
  overallAverageValue: number,
  min: number = CHART_MIN_SALARY,
  max: number = CHART_MAX_SALARY
): number {
  return curveX(valueToT(overallAverageValue, min, max));
}
