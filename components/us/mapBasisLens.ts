// Shared helpers for resolving the map's React-state lens into the income
// basis shown by the map and county result.
import { resolveIncomeBasis, type UsIncomeBasis } from "@/lib/usIncomeCalc";
import { formatTemplate, type Localized, type Translations } from "@/lib/i18n";
import {
  US_GENDERS,
  US_MARITAL_STATUSES,
  type UsGenderId,
  type UsMaritalStatusId,
} from "@/lib/usInput";

// The views offered above the map. NOT the same thing as UsIncomeBasis: a
// lens is the visitor's request ("shade by my marital status"), a basis is
// what that request resolves to once resolveIncomeBasis's priority rule and
// the per-county fallback have had their say.
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
