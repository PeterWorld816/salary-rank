"use client";
// Lightweight, dependency-free tweens for the result card — the percent
// count-up and the distribution chart's sliding marker. Plain
// requestAnimationFrame, no animation library: pulling in framer-motion for
// a couple of ease-out tweens would be a lot of bundle weight for not much.
import { useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 900;

// Exported so callers that need to react to the count-up finishing (the
// tier-based reveal animations — see useRevealAfterCountUp below) stay in
// sync with its actual duration instead of a second hardcoded number.
export const COUNT_UP_DURATION_MS = DEFAULT_DURATION_MS;

// Quick start, gentle settle — the default for numbers.
export function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3);
}

// easeOutBack with a small overshoot (~3% of the distance) — the chart
// marker's "tiny bounce" on arrival.
export function easeOutSoftBack(p: number): number {
  const c1 = 0.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Tweens from whatever value is on screen right now to `target` every time
// `target` changes — so a second change mid-flight carries on from the
// current frame instead of restarting. `initial` is where the very first
// tween starts (omit it to show the first target without animating). A
// null `target` holds the current value. Jumps straight to the target under
// prefers-reduced-motion or while the tab is hidden (and if the tab gets
// hidden mid-tween), so nothing keeps animating in the background.
export function useCountUp(
  target: number | null,
  durationMs: number = DEFAULT_DURATION_MS,
  { initial, easing = easeOutCubic }: { initial?: number; easing?: (p: number) => number } = {}
): number | null {
  const [value, setValue] = useState<number | null>(initial ?? target);
  const valueRef = useRef<number | null>(value);

  useEffect(() => {
    if (target == null) return;
    const commit = (v: number) => {
      valueRef.current = v;
      setValue(v);
    };
    const from = valueRef.current ?? target;
    if (from === target || prefersReducedMotion() || document.hidden) {
      commit(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      // Clamped on both ends — the rAF frame timestamp can land a hair
      // before `start` on the very first frame.
      const progress = Math.min(1, Math.max(0, (now - start) / durationMs));
      commit(progress >= 1 ? (target as number) : from + ((target as number) - from) * easing(progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    function onVisibility() {
      if (!document.hidden) return;
      cancelAnimationFrame(raf);
      commit(target as number);
    }

    raf = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [target, durationMs, easing]);

  return value;
}

// True once the count-up for `target` has settled (or immediately under
// prefers-reduced-motion, which skips useCountUp's own animation too) — lets
// the tier-based reveal effects (badge pulse / gap-note bounce) start right
// as the percent number finishes instead of competing with it. Re-arms
// whenever `target` changes, same as useCountUp.
export function useRevealAfterCountUp(target: number | null, durationMs: number = DEFAULT_DURATION_MS): boolean {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (target == null) {
      setRevealed(false);
      return;
    }

    if (prefersReducedMotion()) {
      setRevealed(true);
      return;
    }

    setRevealed(false);
    const timer = setTimeout(() => setRevealed(true), durationMs);
    return () => clearTimeout(timer);
  }, [target, durationMs]);

  return revealed;
}
