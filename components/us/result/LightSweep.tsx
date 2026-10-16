"use client";
// One-shot diagonal highlight that sweeps across its parent once — or twice,
// back-to-back with a short pause. Pure CSS keyframe (app/globals.css's
// .tier-light-sweep-bar), no animation library. `tone="gold"` is the Top 1%
// shimmer in ResultCelebration.tsx. The parent must be position:relative (or
// similar) — this renders an absolutely-positioned, non-interactive overlay
// clipped to the parent's rounded corners.
const SWEEP_DURATION_MS = 700;
const SWEEP_GAP_MS = 150;

export default function LightSweep({ repeat = 1, tone = "white" }: { repeat?: 1 | 2; tone?: "white" | "gold" }) {
  const bar = tone === "gold" ? "tier-light-sweep-bar tier-light-sweep-bar--gold" : "tier-light-sweep-bar";
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <span className={bar} />
      {repeat === 2 && <span className={bar} style={{ animationDelay: `${SWEEP_DURATION_MS + SWEEP_GAP_MS}ms` }} />}
    </span>
  );
}
