// USD formatting shared by the /us result page and its share card.
export function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

// Shorter "$75K" / "$1.2M" form for tight spaces (e.g. the collapsed input
// panel's one-line summary chip on mobile).
export function formatUsdCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

// Locale-appropriate rounding for "roughly how many people" copy (see
// lib/percentileTable.ts's estimateBandPopulation) — English reads
// naturally in millions, Korean in 만 (10,000s), the language's own large-
// number unit, rather than a literal translation of "X million".
export function formatPeopleCount(count: number, lang: "ko" | "en"): string {
  if (lang === "ko") {
    if (count >= 10_000) return `${Math.round(count / 10_000).toLocaleString("ko-KR")}만`;
    return count.toLocaleString("ko-KR");
  }
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)} million`;
  return count.toLocaleString("en-US");
}

// data/us/countyIncome.json names counties "X County, {State}" — drop the
// redundant state suffix when listing counties on a page already scoped to
// that state (the state's own page, or one of its counties' "nearby" list).
export function stripStateSuffix(name: string, stateName: string): string {
  const suffix = `, ${stateName}`;
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}
