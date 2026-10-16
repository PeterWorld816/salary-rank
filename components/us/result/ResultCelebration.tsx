"use client";
// Band-based celebration for the result card (CompactResultCard.tsx,
// PersonalizedResult.tsx) and the "What if?" slider (ResultGuideTabs.tsx).
// Bands follow the same milestones as lib/resultGuide.ts's GUIDE_MILESTONES,
// and the "median" line is Top 50% of the card's own comparison group — no
// new math, just the percent the card already shows:
//   0 below median — no burst; an encouraging line + the chart's road ahead glows
//   1 Top 50%  — soft glow + 8 sparkles + chip
//   2 Top 25%  — 12 sparkles + chip
//   3 Top 10%  — + ~60 confetti (1.2s)
//   4 Top 5%   — + ~100 confetti (1.6s) + gold card ring
//   5 Top 1%   — + ~140 confetti (2.2s) + one gold shimmer sweep
// A burst plays only when a settled value climbs into a higher band than
// the previous settled one (or once on first load), at most once per 4s.
// Everything here is decoration on top of the card: pointer-events none,
// clipped to the card, never part of the saved share images.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import LightSweep from "@/components/us/result/LightSweep";

const BAND_MAX = [50, 25, 10, 5, 1] as const;
const COOLDOWN_MS = 4000;
// Lines the burst up with the chart marker's arrival (DistributionChart's
// slide is ~850ms; the bounce reads as "landing" a bit before the end).
const ARRIVAL_DELAY_MS = 650;
const SPARKS = [0, 8, 12, 12, 12, 12];
const CONFETTI: Record<number, { count: number; durationMs: number }> = {
  3: { count: 60, durationMs: 1200 },
  4: { count: 100, durationMs: 1600 },
  5: { count: 140, durationMs: 2200 },
};
const CONFETTI_COLORS = ["#34D399", "#FBBF24", "#FDE68A"];

export function celebrationBand(topPercent: number): number {
  let band = 0;
  BAND_MAX.forEach((max, i) => {
    if (topPercent <= max) band = i + 1;
  });
  return band;
}

// `pop` is the burst id while the chip should show that burst's pop-in;
// any later band change without a burst clears it (static swap, no replay).
export type Celebration = { band: number | null; burst: { id: number; band: number } | null; pop: number | null };

export function useResultCelebration(settledPercent: number | null, { playOnFirst = true }: { playOnFirst?: boolean } = {}): Celebration {
  const [state, setState] = useState<Celebration>({ band: null, burst: null, pop: null });
  const prevBand = useRef<number | null>(null);
  const lastFire = useRef(-Infinity);
  const nextId = useRef(1);

  useEffect(() => {
    if (settledPercent == null) return;
    const band = celebrationBand(settledPercent);
    const prev = prevBand.current;
    prevBand.current = band;
    const rising = prev == null ? playOnFirst && band >= 1 : band > prev;
    const now = performance.now();
    if (rising && now - lastFire.current >= COOLDOWN_MS) {
      lastFire.current = now;
      const id = nextId.current++;
      setState({ band, burst: { id, band }, pop: id });
    } else {
      setState((s) => (s.band === band ? s : { band, burst: s.burst, pop: null }));
    }
  }, [settledPercent, playOnFirst]);

  return state;
}

// One line under the card's headline: the band chip, or the encouragement
// line below the median. Fixed height so swapping them never shifts the card.
export function CelebrationChip({ celebration }: { celebration: Celebration }) {
  const { t } = useLanguage();
  const { band, pop } = celebration;
  const label =
    band == null ? null : [t.celebrateBelowMedian, t.celebrateMedian, t.celebrateTop25, t.celebrateTop10, t.celebrateTop5, t.celebrateTop1][band];
  const gold = band != null && band >= 3;

  return (
    <div className="mt-2 flex min-h-[34px] items-center justify-center" aria-live="polite">
      {band === 0 ? (
        <p className="max-w-[300px] text-center text-[11.5px] leading-snug text-white/55">{label}</p>
      ) : band != null ? (
        <span
          key={pop ?? "static"}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${
            pop != null ? "celebrate-chip-pop" : ""
          } ${gold ? "border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FDE68A]" : "border-[#34D399]/35 bg-[#34D399]/10 text-[#6EE7B7]"}`}
        >
          {band === 1 ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
          {label}
        </span>
      ) : null}
    </div>
  );
}

type Fx = { id: number; band: number; x: number; y: number };

// Absolute overlay for the card (the card must be position: relative).
// The burst starts at the element matching `originSelector` inside the card:
// the chart's resting marker point (data-marker-x/y), or the element's
// center for anything else.
export function CelebrationLayer({
  celebration,
  originSelector = "[data-chart-root]",
  goldRing = true,
}: {
  celebration: Celebration;
  originSelector?: string;
  goldRing?: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const hostRef = useRef<HTMLSpanElement>(null);
  const [fx, setFx] = useState<Fx | null>(null);
  const { burst, band } = celebration;

  useEffect(() => {
    if (!burst || reducedMotion) return;
    let cancelled = false;
    let stopConfetti: (() => void) | undefined;
    const fire = setTimeout(() => {
      const host = hostRef.current;
      if (!host || document.hidden) return;
      const origin = findOrigin(host, originSelector);
      setFx({ id: burst.id, band: burst.band, ...origin });
      const spec = CONFETTI[burst.band];
      if (spec) {
        import("@/components/us/result/confettiCanvas").then(({ launchConfetti }) => {
          if (!cancelled) stopConfetti = launchConfetti(host, { ...origin, ...spec, colors: CONFETTI_COLORS });
        });
      }
    }, ARRIVAL_DELAY_MS);
    const clear = setTimeout(() => setFx(null), ARRIVAL_DELAY_MS + 2400);
    return () => {
      cancelled = true;
      clearTimeout(fire);
      clearTimeout(clear);
      stopConfetti?.();
    };
  }, [burst, reducedMotion, originSelector]);

  return (
    <span ref={hostRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {goldRing && band != null && band >= 4 && <span className="celebrate-gold-ring absolute inset-0 rounded-[inherit]" />}
      {fx && (
        <span key={fx.id} className="absolute" style={{ left: fx.x, top: fx.y }}>
          <span className="celebrate-glow" />
          {Array.from({ length: SPARKS[fx.band] }, (_, i) => {
            const angle = (i / SPARKS[fx.band]) * Math.PI * 2 - Math.PI / 2;
            const r = 26 + (i % 3) * 9;
            return (
              <span
                key={i}
                className="celebrate-spark"
                style={
                  {
                    "--dx": `${(Math.cos(angle) * r).toFixed(1)}px`,
                    "--dy": `${(Math.sin(angle) * r).toFixed(1)}px`,
                    animationDelay: `${(i % 4) * 35}ms`,
                    background: i % 2 ? "#FDE68A" : "#FFFFFF",
                  } as CSSProperties
                }
              />
            );
          })}
        </span>
      )}
      {fx?.band === 5 && <LightSweep key={`sweep-${fx.id}`} tone="gold" />}
    </span>
  );
}

function findOrigin(host: HTMLElement, selector: string): { x: number; y: number } {
  const hostRect = host.getBoundingClientRect();
  const el = host.parentElement?.querySelector<HTMLElement>(selector);
  if (!el) return { x: hostRect.width / 2, y: hostRect.height / 2 };
  const r = el.getBoundingClientRect();
  const mx = el.dataset.markerX != null ? Number(el.dataset.markerX) : r.width / 2;
  const my = el.dataset.markerY != null ? Number(el.dataset.markerY) : r.height / 2;
  return { x: r.left - hostRect.left + mx, y: r.top - hostRect.top + my };
}
