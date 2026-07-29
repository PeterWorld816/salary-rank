// Choropleth color scale shared by the state and county maps — dark graphite
// when a geography has no income data yet (placeholder data/us/*.json),
// scaling from a dim green to the full mint accent as median income rises.
const NO_DATA_FILL = "rgba(255,255,255,0.07)";
const LOW = { r: 6, g: 78, b: 59 };
const HIGH = { r: 52, g: 211, b: 153 };

export function incomeFill(value: number | null, min: number, max: number): string {
  if (value == null || !Number.isFinite(value) || !(max > min)) return NO_DATA_FILL;
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const r = Math.round(LOW.r + (HIGH.r - LOW.r) * t);
  const g = Math.round(LOW.g + (HIGH.g - LOW.g) * t);
  const b = Math.round(LOW.b + (HIGH.b - LOW.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export { NO_DATA_FILL };
