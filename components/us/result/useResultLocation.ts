"use client";
// Every /us/result/* step is stateless — it re-derives everything it needs
// from the URL each render (?st=, ?co=, ?d=, same no-server-storage
// principle as the rest of /us). This hook is the one place that parses
// those params, so all three steps agree on what "no location picked yet"
// looks like.
import { useSearchParams } from "next/navigation";
import { getStateByAbbr, type StateMeta } from "@/data/us/stateMeta";
import { getCountyIncome, type UsCountyIncome } from "@/lib/usIncomeCalc";
import { readUsInputFromSearch } from "@/components/us/UsInputPanel";
import type { UsInput } from "@/lib/usInput";

export type ResultLocation =
  | {
      ready: true;
      state: StateMeta;
      county: UsCountyIncome;
      countyFips: string;
      input: UsInput;
      qs: string;
      from: string | null;
    }
  | { ready: false; input: UsInput; qs: string; from: string | null };

// `input`/`qs`/`from` are on both branches — a national result (income vs.
// the whole US) only ever needs `input`, never a county, so callers like
// OverallResultContent can read those without narrowing on `ready` first.
// Only the county/state-specific fields require `ready: true`.
export function useResultLocation(): ResultLocation {
  const sp = useSearchParams();
  const qs = sp.toString();
  const stateAbbr = sp.get("st");
  const countyFips = sp.get("co");
  const state = stateAbbr ? getStateByAbbr(stateAbbr) : null;
  const county = countyFips ? getCountyIncome(countyFips) : null;
  const input = readUsInputFromSearch(sp);
  const from = sp.get("from");

  if (!state || !county || !countyFips) return { ready: false, input, qs, from };

  return { ready: true, state, county, countyFips, input, qs, from };
}

// Builds the ?st=&co=... query string a map click starts the result flow
// with, folding in whatever's already in the current search params (d, lang).
export function buildResultQuery(existing: URLSearchParams, stateAbbr: string, countyFips: string): string {
  const params = new URLSearchParams(existing);
  params.set("st", stateAbbr);
  params.set("co", countyFips);
  return params.toString();
}
