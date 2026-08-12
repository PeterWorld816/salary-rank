// Shared "$X more and you'd reach the top Y%" note builder — used by both
// useCompactResult.ts (the /us, /us/[state], /us/[state]/[county] steps) and
// PersonalizedResult.tsx (the /us/[state]/[county]/[place] + /us/result
// steps) so the two don't drift the way separate copies of this logic
// already had (see the "compact"-vs-"full" percentile gap review).
import { getNextPercentileGap, type PercentileAnchor } from "@/lib/percentileTable";
import { formatTemplate, type Translations } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";

export type PercentileGapInput = {
  t: Translations;
  incomeAnchors: PercentileAnchor[];
  annualIncome: number;
  // Place-relative rescale factor (countyMedian / placeMedian) — pass this
  // when `incomeAnchors` came from a place's *county* (place has no anchors
  // of its own, see getPlaceIncomePercentileFromCounty) so the gap is
  // computed in the same rescaled space the place's own headline percentile
  // uses, then converted back to real dollars. Omit (defaults to 1, i.e. no
  // rescale) for county/state/national-level results, where the anchors
  // already match the value directly.
  incomeScale?: number;
  netWorthAnchors?: PercentileAnchor[];
  netWorth?: number | null;
};

// Renders one line per metric that has real anchor data: a concrete dollar
// gap to the next milestone, or — once the value already beats every
// tracked anchor — the "already at the top" note, instead of just going
// silent (see MAX_PERCENT/getNextPercentileGap in lib/percentileTable.ts).
// Both lines are deduped in case the same "already at the top" copy would
// otherwise repeat for income and net worth.
export function buildPercentileGapNote(input: PercentileGapInput): string | null {
  const { t, incomeAnchors, annualIncome, incomeScale = 1, netWorthAnchors, netWorth } = input;
  const lines: string[] = [];

  if (incomeAnchors.length >= 2) {
    const gap = getNextPercentileGap(incomeAnchors, annualIncome * incomeScale);
    lines.push(
      gap
        ? formatTemplate(t.usPercentileGapIncomeTemplate, {
            amount: formatUsd(Math.ceil(gap.amountNeeded / incomeScale)),
            percent: Math.round(gap.nextTierPercent),
          })
        : t.usPercentileGapMaxedOut
    );
  }

  if (netWorth != null && netWorthAnchors && netWorthAnchors.length >= 2) {
    const gap = getNextPercentileGap(netWorthAnchors, netWorth);
    lines.push(
      gap
        ? formatTemplate(t.usPercentileGapNetWorthTemplate, {
            amount: formatUsd(Math.ceil(gap.amountNeeded)),
            percent: Math.round(gap.nextTierPercent),
          })
        : t.usPercentileGapMaxedOut
    );
  }

  const deduped = [...new Set(lines)];
  return deduped.length > 0 ? deduped.join(" ") : null;
}
