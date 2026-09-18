"use client";
// One-shot diagonal highlight that sweeps across its parent once — or twice,
// back-to-back with a short pause, for the "celebration" tier group (see
// lib/tier.ts's getTierAnimationGroup). Pure CSS keyframe (app/globals.css's
// .tier-light-sweep-bar), no animation library. The parent must be
// position:relative (or similar) — this renders an absolutely-positioned,
// non-interactive overlay clipped to the parent's rounded corners.
const SWEEP_DURATION_MS = 700;
const SWEEP_GAP_MS = 150;

export default function LightSweep({ repeat = 1 }: { repeat?: 1 | 2 }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <span className="tier-light-sweep-bar" />
      {repeat === 2 && <span className="tier-light-sweep-bar" style={{ animationDelay: `${SWEEP_DURATION_MS + SWEEP_GAP_MS}ms` }} />}
    </span>
  );
}
