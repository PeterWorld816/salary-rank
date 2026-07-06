// 뇌 실루엣 SVG path를 좌표점 나열이 아니라 파라미터 방식으로 만든다: 기본 타원 둘레를
// 따라 점을 촘촘히 뽑고, 여러 코사인 성분을 합쳐 표면에 이랑(gyri) 같은 잔물결을 준 뒤
// Catmull-Rom -> Bezier로 매끄러운 폐곡선을 만든다. 진폭을 작게 유지해 전체 윤곽은
// 타원(뇌를 위에서 본 모양)을 유지하면서 표면만 울퉁불퉁하게 만드는 방식.

export const BRAIN_VIEWBOX_W = 240;
export const BRAIN_VIEWBOX_H = 200;
export const BRAIN_CENTER_X = BRAIN_VIEWBOX_W / 2;

const CENTER_Y = 100;
const RADIUS_X = 96;
const RADIUS_Y = 78;
const POINT_COUNT = 48;

export const BRAIN_TOP_Y = CENTER_Y - RADIUS_Y * 1.08;
export const BRAIN_BOTTOM_Y = CENTER_Y + RADIUS_Y * 1.02;

type Pt = [number, number];

function wobble(theta: number): number {
  return (
    1 +
    0.07 * Math.cos(3 * theta) +
    0.05 * Math.cos(5 * theta + 0.6) +
    0.04 * Math.cos(8 * theta + 1.4)
  );
}

function brainOutlinePoints(): Pt[] {
  const points: Pt[] = [];
  for (let i = 0; i < POINT_COUNT; i++) {
    const theta = (i / POINT_COUNT) * Math.PI * 2;
    const r = wobble(theta);
    const x = BRAIN_CENTER_X + RADIUS_X * Math.cos(theta) * r;
    const y = CENTER_Y + RADIUS_Y * Math.sin(theta) * r;
    points.push([x, y]);
  }
  return points;
}

function catmullRomClosedToBezierPath(points: Pt[]): string {
  const n = points.length;
  const at = (i: number) => points[((i % n) + n) % n];
  let d = `M ${points[0][0].toFixed(2)},${points[0][1].toFixed(2)} `;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)} `;
  }
  return `${d}Z`;
}

export const BRAIN_PATH = catmullRomClosedToBezierPath(brainOutlinePoints());
