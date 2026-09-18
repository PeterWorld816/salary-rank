"use client";
// Tier-branched "reveal" effect for the result headline card — plays right
// after that card's percent count-up settles (see lib/useCountUp.ts's
// useRevealAfterCountUp). Branches on lib/tier.ts's getTierAnimationGroup:
//   - "celebration" (gold, top 15%): light sweep twice + a small confetti
//     burst.
//   - "standard" (mint, 15-85%): light sweep once.
//   - "encourage" (bottom 15%): nothing here — that group's badge pulse and
//     gap-note bounce are applied directly to those elements instead (see
//     TierBadge.tsx's `pulse` prop and CoachingInsightCard.tsx's
//     `bounceGapNote` prop), so this component renders nothing for it.
// Renders nothing under prefers-reduced-motion, or before `play` is true.
import { getTierAnimationGroup, type Tier } from "@/lib/tier";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import LightSweep from "@/components/us/result/LightSweep";
import TierConfetti from "@/components/us/result/TierConfetti";

export default function TierRevealAnimation({ tier, play }: { tier: Tier; play: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  if (!play || reducedMotion) return null;

  const group = getTierAnimationGroup(tier);
  if (group === "encourage") return null;

  return (
    <>
      <LightSweep repeat={group === "celebration" ? 2 : 1} />
      {group === "celebration" && <TierConfetti />}
    </>
  );
}
