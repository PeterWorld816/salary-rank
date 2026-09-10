// The "?lens=" query param: which median the county choropleth shades by, and
// which median the county page then quotes so the number doesn't change under
// the visitor when they click through from the map.
//
// Pure — no React, no hooks, no component imports — because it's read from
// two different client trees (app/us/[state]/UsStateClient.tsx and
// components/us/CountyBasisFigure.tsx) and neither should have to depend on
// the other. Same shape as readUsInputFromSearch's "?d=" codec in
// UsInputPanel.tsx: parse defensively, never throw, always land on a usable
// value.
//
// IMPORTANT: everything here is for *client* callers only. A server component
// that reads searchParams opts its whole route out of static rendering, which
// would cost /us/[state] its SSG prerender and /us/[state]/[county] its ISR
// cache — see the header comment on app/us/[state]/[county]/page.tsx.
import { resolveIncomeBasis, type UsIncomeBasis } from "@/lib/usIncomeCalc";
import { formatTemplate, type Localized, type Translations } from "@/lib/i18n";
import {
  US_GENDERS,
  US_MARITAL_STATUSES,
  isDefaultUsInputSelection,
  type UsGenderId,
  type UsInput,
  type UsMaritalStatusId,
} from "@/lib/usInput";

export const MAP_BASIS_LENS_PARAM = "lens";

// The views offered above the map. NOT the same thing as UsIncomeBasis: a
// lens is the visitor's request ("shade by my marital status"), a basis is
// what that request resolves to once resolveIncomeBasis's priority rule and
// the per-county fallback have had their say.
//
// The ids double as the on-the-wire "?lens=" values, so they're kept short and
// URL-legible ("marital", not the basis axis' "maritalStatus").
//
// "occupation" is deliberately NOT a UsIncomeBasis axis — unlike the other
// three, it isn't resolved through resolveIncomeBasis/resolveBasisIncome at
// all (its numbers come from a separate, async, state-only fetch — see
// components/us/useOccupationMapData.ts — not the bundled state/county JSON
// the other three read synchronously). Pages that offer it (only the
// nationwide map — see UsHomeClient.tsx) branch on `lens === "occupation"`
// directly instead of routing it through basisForLens for the fill/label/
// legend data, though basisForLens still accepts it safely (see below) so
// existing "resolve whatever lens I got" call sites never have to guard
// against it themselves.
//
// "personalized" is the same kind of exception, one level up: it's the
// visitor's *whole* answer set (occupation + age band + marital status +
// gender) folded into one combination, not a single axis, so it can't be
// resolved through basisForLens either — see UsHomeClient.tsx, the only page
// that offers it (same state-level-only restriction as "occupation", for the
// same reason: occupation data never goes below state). Automatically
// selected by UsInputPanel.tsx's apply() the moment any of those four
// answers stops matching lib/usInput.ts's DEFAULT_US_INPUT, and dropped back
// to "household" the moment they all match it again.
export type UsMapBasisLens = "household" | "marital" | "gender" | "occupation" | "personalized";

const LENS_IDS: UsMapBasisLens[] = ["household", "marital", "gender", "occupation", "personalized"];

// Marital status is the default because the input panel has no "unanswered"
// state for either axis (see lib/usInput.ts — gender and maritalStatus are
// both required fields with defaults), so every visitor arrives with *both*
// axes selected, and resolveIncomeBasis() resolves that pair to marital
// status. Defaulting to "household" would instead show a map that ignores the
// answers the visitor just gave.
export const DEFAULT_MAP_BASIS_LENS: UsMapBasisLens = "marital";

// Missing, misspelled, or hand-edited "?lens=" values all fall back to a
// default rather than erroring or blanking the map — a shared link that
// predates this param is the common case, not an edge case.
//
// `input`, when passed, lets that fallback default to "personalized" instead
// of the plain household-axis default whenever the visitor's answers already
// differ from DEFAULT_US_INPUT — otherwise a shared "?d=..." result link (or
// a refresh/back-navigation) would land with the map still shaded by "All
// households"/"Single households" even though the URL already encodes a
// combination that Personalized exists to show, and the visitor would have
// to notice and tap the tab themselves to see their own numbers. Only the
// nationwide map (the only page that ever offers "personalized" as a real
// choice) passes `input` here; the state/county call sites omit it and keep
// resolving to DEFAULT_MAP_BASIS_LENS, since "personalized" reaching them
// only ever means it rode along from the nationwide map's own "?lens=" and
// gets forced back off there regardless (see UsStateClient.tsx).
export function readMapBasisLensFromSearch(
  sp: URLSearchParams | { get(k: string): string | null },
  input?: UsInput
): UsMapBasisLens {
  const raw = sp.get(MAP_BASIS_LENS_PARAM);
  if (raw != null && LENS_IDS.includes(raw as UsMapBasisLens)) return raw as UsMapBasisLens;
  if (input && !isDefaultUsInputSelection(input)) return "personalized";
  return DEFAULT_MAP_BASIS_LENS;
}

// Writes the lens onto a copy of the current query string, preserving
// everything already there (d, lang, st/co, from). Returns the params rather
// than a full href so callers keep control of the pathname.
export function withMapBasisLens(existing: URLSearchParams, lens: UsMapBasisLens): URLSearchParams {
  const params = new URLSearchParams(existing);
  params.set(MAP_BASIS_LENS_PARAM, lens);
  return params;
}

// Translates a lens + the visitor's answers into the basis actually painted.
// Deliberately routed through resolveIncomeBasis rather than switching on the
// lens directly, so the "both axes selected -> marital wins" priority rule
// lives in exactly one place (lib/usIncomeCalc.ts). "occupation" isn't a real
// UsIncomeBasis axis (see the type comment above) — it falls through both
// checks below and resolves to the same plain household basis "household"
// itself would, which is exactly the fallback callers want while an
// occupation fetch is in flight or unavailable.
export function basisForLens(lens: UsMapBasisLens, gender: UsGenderId, maritalStatus: UsMaritalStatusId): UsIncomeBasis {
  return resolveIncomeBasis(lens === "gender" ? gender : null, lens === "marital" ? maritalStatus : null);
}

export type BasisLabel = {
  // "Median earnings" vs "Median income" — the unit is part of the headline,
  // not a footnote, since the same frame shows both over a session.
  metric: string;
  // "Single households" / "Male (individual)" / "All households".
  group: string;
  // Convenience join, e.g. "Median income · Single households".
  full: string;
};

// `t`/`tr` are passed in rather than pulled from useLanguage() so this file
// stays hook-free and both the map control and the county page can share it.
export function basisLabel(
  basis: UsIncomeBasis,
  t: Translations,
  tr: (text: Localized) => string
): BasisLabel {
  const metric = basis.unit === "individual" ? t.usMapBasisMetricIndividual : t.usMapBasisMetricHousehold;

  let group: string;
  if (basis.axis === "gender") {
    const label = tr(US_GENDERS.find((g) => g.id === basis.gender)?.label ?? { ko: "", en: "" });
    group = formatTemplate(t.usMapBasisOptionGenderTemplate, { gender: label });
  } else if (basis.axis === "maritalStatus") {
    const label = tr(US_MARITAL_STATUSES.find((m) => m.id === basis.maritalStatus)?.label ?? { ko: "", en: "" });
    group = formatTemplate(t.usMapBasisOptionMaritalTemplate, { status: label });
  } else {
    group = t.usMapBasisOptionHousehold;
  }

  return { metric, group, full: `${metric} · ${group}` };
}

// The English article explaining why the two units aren't comparable. Pinned
// to /us (not the current locale base) on purpose: content/insights/ko has no
// translation of this slug yet, and /kr/insights/<untranslated-slug> 404s —
// an English explainer beats a dead link.
export const UNIT_EXPLAINER_HREF = "/us/insights/household-vs-individual-income";
