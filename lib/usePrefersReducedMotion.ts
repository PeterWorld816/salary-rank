"use client";
// Single reactive prefers-reduced-motion check, separate from
// useCountUp.ts's own inline (one-time-read) check — this one is for the
// tier reveal effects (light sweep / confetti), which need to know whether
// to mount at all rather than just skip a tween.
import { useEffect, useState } from "react";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
