"use client";
// A "{percent}" template (e.g. "Top {percent}%") whose number rolls from
// what's on screen to the new value (lib/useCountUp.ts) instead of jumping.
// Its own tiny component so the per-frame re-render stays here, not in the
// whole result card. Screen readers get the final value once (aria-live on a
// visually hidden copy); the rolling digits are aria-hidden.
import { useCountUp } from "@/lib/useCountUp";

export default function CountUpTemplate({ template, value, durationMs = 700 }: { template: string; value: number; durationMs?: number }) {
  const shown = Math.round(useCountUp(value, durationMs) ?? value);
  const [before, after = ""] = template.split("{percent}");
  return (
    <>
      <span aria-hidden>
        {before}
        <span className="tabular-nums">{shown}</span>
        {after}
      </span>
      <span className="sr-only" aria-live="polite">
        {before}
        {value}
        {after}
      </span>
    </>
  );
}
