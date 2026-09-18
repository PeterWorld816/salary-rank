"use client";
// Lightweight, dependency-free count-up — the "oh, neat" flourish on the
// result headline's big percentile number. Plain requestAnimationFrame, no
// animation library: this is the only place on the site that needs one, so
// pulling in framer-motion or similar for a single ease-out tween would be
// a lot of bundle weight for not much.
import { useEffect, useState } from "react";

const DEFAULT_DURATION_MS = 900;

// Exported so callers that need to react to the count-up finishing (the
// tier-based reveal animations — see useRevealAfterCountUp below) stay in
// sync with its actual duration instead of a second hardcoded number.
export const COUNT_UP_DURATION_MS = DEFAULT_DURATION_MS;

// Counts from 0 up to `target` every time `target` changes (including the
// first render it becomes non-null) — so it re-plays if the visitor edits
// their income and the percentile updates, not just on first load. Skips
// straight to `target` under prefers-reduced-motion. Returns null while
// `target` itself is null (nothing to animate toward yet) — callers should
// fall back to 0 or hide the number in that case.
export function useCountUp(target: number | null, durationMs: number = DEFAULT_DURATION_MS): number | null {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    if (target == null) {
      setValue(null);
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setValue(target);
      return;
    }

    const targetValue = target;
    let raf = 0;
    const start = performance.now();

    function tick(now: number) {
      // Clamped on both ends — `now` (the rAF callback's frame timestamp)
      // can land a hair before `start` (captured via performance.now() in
      // this effect) on the very first frame, since the two clocks don't
      // always agree to the millisecond. An unclamped negative progress
      // here briefly renders a negative percent (e.g. "Top -2%") before the
      // very next frame corrects it.
      const progress = Math.min(1, Math.max(0, (now - start) / durationMs));
      // Ease-out cubic — quick start, gentle settle at the target instead of
      // a linear count that feels mechanical.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(targetValue * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

// True once the count-up for `target` has settled (or immediately under
// prefers-reduced-motion, which skips useCountUp's own animation too) — lets
// the tier-based reveal effects (light sweep / confetti / badge pulse / gap-
// note bounce) start right as the percent number finishes instead of
// competing with it. Re-arms whenever `target` changes, same as useCountUp.
export function useRevealAfterCountUp(target: number | null, durationMs: number = DEFAULT_DURATION_MS): boolean {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (target == null) {
      setRevealed(false);
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setRevealed(true);
      return;
    }

    setRevealed(false);
    const timer = setTimeout(() => setRevealed(true), durationMs);
    return () => clearTimeout(timer);
  }, [target, durationMs]);

  return revealed;
}
