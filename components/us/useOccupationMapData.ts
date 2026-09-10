"use client";
// Fetches every state's occupation file (public/us-occupation/*.json — the
// same per-state PUMS-derived data the personalized result's occupation card
// already fetches one state at a time, see lib/usOccupationIncome.ts) and
// resolves each state's median for one occupation x age-band x sex combo, so
// the nationwide map can shade by occupation instead of household income.
// Deliberately state-level only, same as the rest of the occupation feature
// — there's no county/place breakdown to fetch.
import { useEffect, useState } from "react";
import { US_STATES } from "@/data/us/stateMeta";
import { fetchStateOccupationData, getOccupationMedianIncome, type OccupationMedianResult } from "@/lib/usOccupationIncome";

export type OccupationMapData = {
  byFips: Map<string, OccupationMedianResult>;
  loading: boolean;
};

export function useOccupationMapData(occId: string | null, ageBucket: string | null, sex: "1" | "2"): OccupationMapData {
  const [byFips, setByFips] = useState<Map<string, OccupationMedianResult>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!occId || !ageBucket) {
      setByFips(new Map());
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    // Narrowed to plain `string` here so `worker` below (a nested function,
    // which TS doesn't re-narrow `occId`/`ageBucket` through) can use them
    // without a redundant null check on every iteration.
    const occIdValue = occId;
    const ageBucketValue = ageBucket;

    // Firing all 51 state fetches (and the JSON parsing of their responses,
    // ~6.5MB combined) in one Promise.all used to land in a single burst the
    // instant every response came back, which is what made the map (and the
    // tab that triggers this the first time) look hung for several seconds
    // on the initial activation — subsequent switches were instant only
    // because fetchStateOccupationData's cache already held the resolved
    // promises. A small fixed-size worker pool spreads the fetch/parse work
    // over time instead of one synchronous spike, without changing the total
    // number of requests or adding a new cache layer.
    const CONCURRENCY = 6;
    const queue = US_STATES.slice();
    const results = new Map<string, OccupationMedianResult>();

    async function worker() {
      while (!cancelled) {
        const state = queue.shift();
        if (!state) return;
        const data = await fetchStateOccupationData(state.abbr);
        if (cancelled) return;
        const result = getOccupationMedianIncome(occIdValue, ageBucketValue, sex, data);
        if (result) results.set(state.fips, result);
      }
    }

    Promise.all(Array.from({ length: Math.min(CONCURRENCY, US_STATES.length) }, worker)).then(() => {
      if (cancelled) return;
      setByFips(results);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [occId, ageBucket, sex]);

  return { byFips, loading };
}
