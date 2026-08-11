"use client";
// Every /us/result/* step is stateless — it re-derives everything it needs
// from the URL each render (?st=, ?co=, ?d=, same no-server-storage
// principle as the rest of /us). This hook is the one place that parses
// those params, so all callers agree on what "no location picked yet"
// looks like.
//
// State/county/place can also arrive already resolved from the server (the
// /us/[state]/[county]/[place] route tree — see those pages' `resolve()`)
// instead of from ?st=/?co=/?pl=. `presetState`/`presetCounty`/`presetPlace`
// take priority when given; the query-string lookup only runs as a fallback,
// which keeps this hook usable both there and on the nationwide-only
// /us/result page (no route params to preset from).
import { useSearchParams } from "next/navigation";
import { getStateByAbbr, type StateMeta } from "@/data/us/stateMeta";
import { getCountyIncome, getPlaceIncome, type UsCountyIncome, type UsPlaceIncome } from "@/lib/usIncomeCalc";
import { readUsInputFromSearch } from "@/components/us/UsInputPanel";
import type { UsInput } from "@/lib/usInput";

export type ResultLocation =
  | {
      ready: true;
      state: StateMeta;
      county: UsCountyIncome;
      countyFips: string;
      place: UsPlaceIncome | null;
      input: UsInput;
      qs: string;
      from: string | null;
    }
  | { ready: false; input: UsInput; qs: string; from: string | null };

// `input`/`qs`/`from` are on both branches — a national result (income vs.
// the whole US) only ever needs `input`, never a county, so callers like
// OverallResultContent can read those without narrowing on `ready` first.
// Only the county/state/place-specific fields require `ready: true`.
export function useResultLocation(
  presetState?: StateMeta | null,
  presetCounty?: UsCountyIncome | null,
  presetPlace?: UsPlaceIncome | null
): ResultLocation {
  const sp = useSearchParams();
  const qs = sp.toString();
  const stateAbbr = sp.get("st");
  const countyFipsParam = sp.get("co");
  const placeFipsParam = sp.get("pl");
  const input = readUsInputFromSearch(sp);
  const from = sp.get("from");

  const state = presetState ?? (stateAbbr ? getStateByAbbr(stateAbbr) : null);
  const county = presetCounty ?? (countyFipsParam ? getCountyIncome(countyFipsParam) : null);
  const countyFips = county?.fips ?? null;

  if (!state || !county || !countyFips) return { ready: false, input, qs, from };

  // A place only counts if it's actually inside this county — a stale/
  // mismatched preset or ?pl= (e.g. hand-edited URL, or left over after a
  // county change) silently drops back to county-only rather than showing
  // the wrong city.
  const rawPlace = presetPlace !== undefined ? presetPlace : placeFipsParam ? getPlaceIncome(placeFipsParam) : null;
  const place = rawPlace && rawPlace.countyFips === countyFips ? rawPlace : null;

  return { ready: true, state, county, countyFips, place, input, qs, from };
}

// Builds the href to a county's merged SEO+result page
// (/us/[state]/[county]), carrying forward whatever's already in the query
// string (d, lang, from) — dropping `pl` since picking a new county
// invalidates whatever place was selected before.
export function buildCountyHref(base: string, existing: URLSearchParams, stateAbbr: string, countyFips: string): string {
  const params = new URLSearchParams(existing);
  params.delete("pl");
  const qs = params.toString();
  return qs ? `${base}/${stateAbbr}/${countyFips}?${qs}` : `${base}/${stateAbbr}/${countyFips}`;
}

// Same, plus a specific place within that county
// (/us/[state]/[county]/[place]).
export function buildPlaceHref(base: string, existing: URLSearchParams, stateAbbr: string, countyFips: string, placeFips: string): string {
  const qs = existing.toString();
  return qs ? `${base}/${stateAbbr}/${countyFips}/${placeFips}?${qs}` : `${base}/${stateAbbr}/${countyFips}/${placeFips}`;
}
