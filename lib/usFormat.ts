// USD formatting shared by the /us result page and its share card.
export function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}
