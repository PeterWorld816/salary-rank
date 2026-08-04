// Choropleth color scale shared by the state and county maps — a bright
// off-white/graphite fill when a geography has no income data yet
// (placeholder data/us/*.json), otherwise a quantized dark-slate -> mint ->
// light-mint gradient as median income rises. Quantized (fixed bands, not a
// smooth blend) so components/us/IncomeLegend.tsx can show a clean
// "this color = this income range" key that matches the map exactly.
const NO_DATA_FILL = "rgba(255,255,255,0.07)";

const SLATE = { r: 15, g: 27, b: 22 }; // #0F1B16
const MINT = { r: 52, g: 211, b: 153 }; // #34D399
const LIGHT_MINT = { r: 167, g: 243, b: 208 }; // #A7F3D0

export const INCOME_SCALE_STEPS = 6;

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

// t in [0, 1] — slate through mint (first half), mint through light mint
// (second half), so the mid-range of the scale reads as the brand mint.
function gradientColor(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const [from, to, localT] = clamped <= 0.5 ? [SLATE, MINT, clamped / 0.5] : [MINT, LIGHT_MINT, (clamped - 0.5) / 0.5];
  const r = lerp(from.r, to.r, localT);
  const g = lerp(from.g, to.g, localT);
  const b = lerp(from.b, to.b, localT);
  return `rgb(${r}, ${g}, ${b})`;
}

function stepIndex(value: number, min: number, max: number, steps: number): number {
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return Math.min(steps - 1, Math.floor(t * steps));
}

export function incomeFill(value: number | null, min: number, max: number, steps: number = INCOME_SCALE_STEPS): string {
  if (value == null || !Number.isFinite(value) || !(max > min)) return NO_DATA_FILL;
  const index = stepIndex(value, min, max, steps);
  return gradientColor((index + 0.5) / steps);
}

export type IncomeScaleBand = { loValue: number; hiValue: number; color: string };

// The exact bands incomeFill() picks from, for the legend to render — same
// min/max/steps in, same colors out.
export function buildIncomeScaleBands(min: number, max: number, steps: number = INCOME_SCALE_STEPS): IncomeScaleBand[] {
  if (!(max > min)) return [];
  return Array.from({ length: steps }, (_, i) => {
    const loT = i / steps;
    const hiT = (i + 1) / steps;
    return {
      loValue: min + (max - min) * loT,
      hiValue: min + (max - min) * hiT,
      color: gradientColor((loT + hiT) / 2),
    };
  });
}

export { NO_DATA_FILL };
