"use client";
// Small, brief confetti burst for the "celebration" tier group (top 15% —
// see lib/tier.ts's getTierAnimationGroup) — 7 tiny squares/circles falling
// from the top of the card over ~1s. Pure CSS keyframe
// (app/globals.css's .tier-confetti-piece), no library: kept deliberately
// subtle (small pieces, short fall, low count) so it reads as a flourish on
// the result card rather than a full-screen effect.
const PIECES: { left: string; size: number; shape: "circle" | "square"; color: string; delayMs: number; durationMs: number }[] = [
  { left: "8%", size: 6, shape: "circle", color: "#FBBF24", delayMs: 0, durationMs: 900 },
  { left: "22%", size: 5, shape: "square", color: "#34D399", delayMs: 60, durationMs: 950 },
  { left: "38%", size: 7, shape: "circle", color: "#FFFFFF", delayMs: 120, durationMs: 880 },
  { left: "52%", size: 5, shape: "square", color: "#FBBF24", delayMs: 40, durationMs: 1000 },
  { left: "66%", size: 6, shape: "circle", color: "#34D399", delayMs: 100, durationMs: 920 },
  { left: "80%", size: 5, shape: "square", color: "#FFFFFF", delayMs: 20, durationMs: 960 },
  { left: "92%", size: 6, shape: "circle", color: "#FBBF24", delayMs: 80, durationMs: 890 },
];

export default function TierConfetti() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="tier-confetti-piece absolute top-0"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            animationDelay: `${p.delayMs}ms`,
            animationDuration: `${p.durationMs}ms`,
          }}
        />
      ))}
    </span>
  );
}
