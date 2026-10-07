"use client";
// Every /us/result/* step is stateless — it re-derives everything it needs
// from the URL each render (?st=, ?co=). Calculator answers live in shared
// React state; this hook parses location params so callers agree on what "no
// location picked yet" looks like.
//
// State/county/place can also arrive already resolved from the server (the
// /us/[state]/[county]/[place] route tree — see those pages' `resolve()`)
// instead of from ?st=/?co=/?pl=. `presetState`/`presetCounty`/`presetPlace`
// take priority when given.
//
// There's no ?co=/?pl= fallback lookup here (there used to be): county/place
// data is server-only (lib/usCountyPlaceData.ts) precisely because it's too
// large to bundle client-side, so this hook can't resolve an arbitrary fips
// on its own. That's fine in practice — /us/result redirects any ?st=&co=
// URL to the real /us/[state]/[county] page (which supplies presetCounty)
// before it ever reaches here, so a bare ?co=/?pl= with no preset isn't a
// reachable case from any real link on the site.
import { useSearchParams } from "next/navigation";
import { getStateByAbbr, type StateMeta } from "@/data/us/stateMeta";
import type { UsCountyIncome, UsPlaceIncome } from "@/lib/usIncomeCalc";
import { useUsInput } from "@/components/us/UsInputContext";
import type { UsInput } from "@/lib/usInput";

export type ResultLocation =
  | {
      ready: true;
      state: StateMeta;
      county: UsCountyIncome;
      countyFips: string;
      place: UsPlaceIncome | null;
      input: UsInput;
      from: string | null;
    }
  | { ready: false; input: UsInput; from: string | null };

// `input`/`from` are on both branches — a national result (income vs.
// the whole US) only ever needs `input`, never a county, so callers like
// OverallResultContent can read those without narrowing on `ready` first.
// Only the county/state/place-specific fields require `ready: true`.
export function useResultLocation(
  presetState?: StateMeta | null,
  presetCounty?: UsCountyIncome | null,
  presetPlace?: UsPlaceIncome | null
): ResultLocation {
  const sp = useSearchParams();
  const { input } = useUsInput();
  const stateAbbr = sp.get("st");
  const from = sp.get("from");

  const state = presetState ?? (stateAbbr ? getStateByAbbr(stateAbbr) : null);
  const county = presetCounty ?? null;
  const countyFips = county?.fips ?? null;

  if (!state || !county || !countyFips) return { ready: false, input, from };

  // A place only counts if it's actually inside this county — a stale/
  // mismatched preset (e.g. left over after a county change) silently drops
  // back to county-only rather than showing the wrong city.
  const rawPlace = presetPlace ?? null;
  const place = rawPlace && rawPlace.countyFips === countyFips ? rawPlace : null;

  return { ready: true, state, county, countyFips, place, input, from };
}

export function buildPlaceHref(base: string, stateAbbr: string, countyFips: string, placeFips: string): string {
  return `${base}/${stateAbbr}/${countyFips}/${placeFips}`;
}
