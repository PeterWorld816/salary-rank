// "Beat N of 10" decile visualization for a "top X%" percentile — see the
// dot row in UsShareCardWide/Story/Compact (components/us/ShareCardBits.tsx's
// ShareDecileDots), which replaced those cards' old DistributionChart. Lower
// topPercent is better (Top 1% beats nearly everyone), so the number of
// people you're ahead of scales with (100 - topPercent), bucketed into
// tenths and rounded to the nearest dot — e.g. Top 35% beats 65% of people,
// which rounds to 7 of 10 dots filled.
export const DOT_COUNT = 10;

export function filledDotsFromPercent(topPercent: number): number {
  const beatShare = 100 - topPercent;
  return Math.min(DOT_COUNT, Math.max(0, Math.round(beatShare / 10)));
}
