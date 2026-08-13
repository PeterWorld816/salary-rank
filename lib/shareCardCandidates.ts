// Shared "which percentile gets the spotlight" logic for the save-image
// cards (components/us/UsShareCardWide.tsx, UsShareCardStory.tsx) — same
// "best rank wins, contrast it with the income baseline if it's 10+ points
// better" idea PersonalizedResult.tsx's own on-page headline uses, factored
// out here so both cards (and PersonalizedResult, if it ever wants the same
// pick) share one implementation instead of three.
export type NamedPercent = { key: string; label: string; percent: number };

export function pickFeaturedPercentiles(
  candidates: NamedPercent[],
  incomeBasis: NamedPercent | null
): { featured: NamedPercent | null; secondary: NamedPercent | null; rest: NamedPercent[] } {
  const sorted = [...candidates].sort((a, b) => a.percent - b.percent);
  const featured = sorted[0] ?? null;

  let secondary: NamedPercent | null = null;
  if (featured) {
    if (incomeBasis && incomeBasis.key !== featured.key && featured.percent <= incomeBasis.percent - 10) {
      secondary = incomeBasis;
    } else {
      secondary = sorted.find((c) => c.key !== featured.key) ?? null;
    }
  }

  const rest = candidates.filter((c) => c.key !== featured?.key && c.key !== secondary?.key);
  return { featured, secondary, rest };
}
