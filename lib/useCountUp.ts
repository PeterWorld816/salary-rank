"use client";
// Lightweight, dependency-free count-up — the "oh, neat" flourish on the
// result headline's big percentile number. Plain requestAnimationFrame, no
// animation library: this is the only place on the site that needs one, so
// pulling in framer-motion or similar for a single ease-out tween would be
// a lot of bundle weight for not much.
import { useEffect, useState } from "react";

const DEFAULT_DURATION_MS = 900;

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
      const progress = Math.min(1, (now - start) / durationMs);
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
