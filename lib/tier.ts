// Maps a "top N%" number (the same lower-is-better percentile already shown
// across /us — see lib/usIncomeCalc.ts) to a gamified tier badge. Used for
// both income and net worth percentiles, which share the same buckets. Pure
// function, no React — safe to reuse in the result page and the share card
// (components/us/UsResultCard.tsx renders it with inline styles instead of
// Tailwind classes).

export type TierColor = "gold" | "mint";

export type Tier = {
  emoji: string;
  label: string;
  color: TierColor;
};

const TIER_LEVELS: { max: number; emoji: string; label: string; color: TierColor }[] = [
  { max: 1, emoji: "🏆", label: "Elite Earner", color: "gold" },
  { max: 5, emoji: "💎", label: "High Roller", color: "gold" },
  { max: 15, emoji: "🚀", label: "Fast Climber", color: "gold" },
  { max: 35, emoji: "📈", label: "Above Average", color: "mint" },
  { max: 60, emoji: "🌱", label: "Steady Grower", color: "mint" },
  { max: 85, emoji: "🔧", label: "Building Up", color: "mint" },
];

const FALLBACK_TIER: Tier = { emoji: "🌟", label: "Just Getting Started", color: "mint" };

export function getTier(topPercent: number): Tier {
  const level = TIER_LEVELS.find((l) => topPercent <= l.max);
  return level ? { emoji: level.emoji, label: level.label, color: level.color } : FALLBACK_TIER;
}
