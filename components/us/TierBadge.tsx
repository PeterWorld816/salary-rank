import type { Tier } from "@/lib/tier";

const COLOR_CLASSES: Record<Tier["color"], string> = {
  gold: "border-[#FBBF24]/40 bg-[#FBBF24]/15 text-[#FBBF24]",
  mint: "border-[#34D399]/40 bg-[#34D399]/15 text-[#34D399]",
};

export default function TierBadge({
  tier,
  className = "",
  pulse = false,
}: {
  tier: Tier;
  className?: string;
  // "encourage" tier group's reveal effect (see lib/tier.ts's
  // getTierAnimationGroup) — a brief scale pulse instead of the light-sweep
  // the other two groups get. Never changes tier.color, so the fallback
  // tier's mint stays mint.
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-bold ${COLOR_CLASSES[tier.color]} ${pulse ? "tier-badge-pulse" : ""} ${className}`}
    >
      <span>{tier.emoji}</span>
      <span>{tier.label}</span>
    </span>
  );
}
