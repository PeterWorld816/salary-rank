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
import { US_GENDERS, US_MARITAL_STATUSES, type UsGenderId, type UsMaritalStatusId } from "@/lib/usInput";

export const MAP_BASIS_LENS_PARAM = "lens";

// The three views offered above the map. NOT the same thing as UsIncomeBasis:
// a lens is the visitor's request ("shade by my marital status"), a basis is
// what that request resolves to once resolveIncomeBasis's priority rule and
// the per-county fallback have had their say.
//
// The ids double as the on-the-wire "?lens=" values, so they're kept short and
// URL-legible ("marital", not the basis axis' "maritalStatus").
export type UsMapBasisLens = "household" | "marital" | "gender";

const LENS_IDS: UsMapBasisLens[] = ["household", "marital", "gender"];

// Marital status is the default because the input panel has no "unanswered"
// state for either axis (see lib/usInput.ts — gender and maritalStatus are
// both required fields with defaults), so every visitor arrives with *both*
// axes selected, and resolveIncomeBasis() resolves that pair to marital
// status. Defaulting to "household" would instead show a map that ignores the
// answers the visitor just gave.
export const DEFAULT_MAP_BASIS_LENS: UsMapBasisLens = "marital";

// Missing, misspelled, or hand-edited "?lens=" values all fall back to the
// default rather than erroring or blanking the map — a shared link that
// predates this param is the common case, not an edge case.
export function readMapBasisLensFromSearch(sp: URLSearchParams | { get(k: string): string | null }): UsMapBasisLens {
  const raw = sp.get(MAP_BASIS_LENS_PARAM);
  return LENS_IDS.includes(raw as UsMapBasisLens) ? (raw as UsMapBasisLens) : DEFAULT_MAP_BASIS_LENS;
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
// lives in exactly one place (lib/usIncomeCalc.ts).
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
