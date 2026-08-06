import type { Tier } from "@/lib/tier";

const COLOR_CLASSES: Record<Tier["color"], string> = {
  gold: "border-[#FBBF24]/40 bg-[#FBBF24]/15 text-[#FBBF24]",
  mint: "border-[#34D399]/40 bg-[#34D399]/15 text-[#34D399]",
};

export default function TierBadge({ tier, className = "" }: { tier: Tier; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-bold ${COLOR_CLASSES[tier.color]} ${className}`}
    >
      <span>{tier.emoji}</span>
      <span>{tier.label}</span>
    </span>
  );
}
