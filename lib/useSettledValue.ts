"use client";
// "Has the input stopped moving?" — returns `value` only once it has stayed
// the same for `delayMs`, so the result card's tweens and celebrations start
// after the visitor settles on a number rather than on every intermediate
// one. The first value (once `ready`) passes straight through so the first
// result still animates in on page load. Null until then.
import { useEffect, useRef, useState } from "react";

export const SETTLE_DELAY_MS = 400;

export function useSettledValue<T>(value: T, { ready = true, delayMs = SETTLE_DELAY_MS }: { ready?: boolean; delayMs?: number } = {}): T | null {
  const [settled, setSettled] = useState<T | null>(null);
  const hasSettled = useRef(false);
  const latest = useRef(value);
  latest.current = value;
  // Compared by content, not identity — callers pass fresh objects/arrays.
  const key = JSON.stringify(value);

  useEffect(() => {
    if (!ready) return;
    if (!hasSettled.current) {
      hasSettled.current = true;
      setSettled(latest.current);
      return;
    }
    const timer = setTimeout(() => setSettled(latest.current), delayMs);
    return () => clearTimeout(timer);
  }, [key, ready, delayMs]);

  return settled;
}
