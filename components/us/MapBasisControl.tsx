"use client";
// The "what am I looking at?" strip above the county choropleth: a segmented
// control picking which median the map shades by, plus a plain-language label
// naming the current basis ("Median income · Single households").
//
// The options come from the visitor's own answers in the input panel rather
// than being free-form — the map's job is to re-cut the same county data along
// an axis the visitor already told us about, not to become a second data
// browser. The lens codec, the priority rule, and the label wording all live
// in components/us/mapBasisLens.ts, shared with the county page.
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
import { US_GENDERS, US_MARITAL_STATUSES, type UsGenderId, type UsMaritalStatusId } from "@/lib/usInput";
import type { UsIncomeBasis } from "@/lib/usIncomeCalc";
import { basisLabel, UNIT_EXPLAINER_HREF, type UsMapBasisLens } from "@/components/us/mapBasisLens";

export default function MapBasisControl({
  lens,
  onLensChange,
  basis,
  gender,
  maritalStatus,
  occupationOption,
  personalizedOption,
  forcedOffNotice,
}: {
  lens: UsMapBasisLens;
  onLensChange: (lens: UsMapBasisLens) => void;
  // Passed in rather than recomputed here so the label can never disagree
  // with the values the map was actually painted from.
  basis: UsIncomeBasis;
  gender: UsGenderId;
  maritalStatus: UsMaritalStatusId;
  // Extra "SHADING" button for the visitor's currently selected occupation —
  // only the nationwide map ever passes this (see UsHomeClient.tsx); the
  // state map never does, since county-level occupation data isn't reliable
  // (see lib/usOccupationIncome.ts) and so never offers the option at all.
  occupationOption?: { label: string } | null;
  // "Personalized (Your filters)" — the visitor's whole answer set combined
  // (see mapBasisLens.ts's UsMapBasisLens comment). Like occupationOption,
  // only the nationwide map ever passes this; fully composed upstream
  // (UsHomeClient.tsx) since building its label means reaching into pieces
  // (occupation, age band, marital/gender) this component doesn't otherwise
  // need to know about.
  personalizedOption?: { tabLabel: string; metric: string; group: string } | null;
  // Shown instead when the visitor arrives here (a state's county map) with
  // "?lens=occupation" or "?lens=personalized" still in the URL from the
  // home map — explains why the map fell back to all-households rather than
  // silently ignoring it.
  forcedOffNotice?: string | null;
}) {
  const { t, tr } = useLanguage();

  const genderLabel = tr(US_GENDERS.find((g) => g.id === gender)?.label ?? { ko: "", en: "" });
  const maritalLabel = tr(US_MARITAL_STATUSES.find((m) => m.id === maritalStatus)?.label ?? { ko: "", en: "" });

  // The button labels name the visitor's own answer for each axis, so they
  // read the same whichever one is currently active — unlike the basis label
  // below, which only ever describes the active one.
  const options: { id: UsMapBasisLens; label: string }[] = [
    { id: "household", label: t.usMapBasisOptionHousehold },
    { id: "marital", label: formatTemplate(t.usMapBasisOptionMaritalTemplate, { status: maritalLabel }) },
    { id: "gender", label: formatTemplate(t.usMapBasisOptionGenderTemplate, { gender: genderLabel }) },
    ...(occupationOption ? [{ id: "occupation" as const, label: occupationOption.label }] : []),
    ...(personalizedOption ? [{ id: "personalized" as const, label: personalizedOption.tabLabel }] : []),
  ];

  // Occupation and Personalized aren't UsIncomeBasis axes (see
  // mapBasisLens.ts), so `basis` itself never describes either one — build
  // the label by hand while they're active rather than mislabeling the map
  // as "All households" while it's actually shaded by something else.
  const label =
    lens === "occupation" && occupationOption
      ? { metric: t.usMapBasisMetricIndividual, group: occupationOption.label, full: `${t.usMapBasisMetricIndividual} · ${occupationOption.label}` }
      : lens === "personalized" && personalizedOption
        ? { metric: personalizedOption.metric, group: personalizedOption.group, full: `${personalizedOption.metric} · ${personalizedOption.group}` }
        : basisLabel(basis, t, tr);

  return (
    <div className="mb-3 flex flex-col gap-2 px-1">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{t.usMapBasisHeading}</span>
        {/* Mobile: a horizontally scrollable single row with a fade hint at
            the trailing edge and a >=40px tap target per pill — the earlier
            flex-wrap version squeezed every tab (plus the occupation/
            personalized extras) onto one cramped, hard-to-tap line at phone
            widths. sm+ reverts to the original wrapping row. */}
        <div className="relative -mx-1 sm:mx-0">
          <div
            className="flex gap-1.5 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label={t.usMapBasisHeading}
          >
            {options.map((o) => {
              const active = o.id === lens;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onLensChange(o.id)}
                  aria-pressed={active}
                  style={{ minHeight: 40 }}
                  className={`flex shrink-0 items-center whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors sm:min-h-0 sm:px-3 sm:py-1 sm:text-[12px] ${
                    active
                      ? "bg-[#34D399] text-[#04120C]"
                      : "border border-white/10 bg-white/[0.06] text-white/70 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0d0f11] to-transparent sm:hidden"
            aria-hidden
          />
        </div>
      </div>

      <p aria-live="polite" className="text-[13px] font-semibold text-white/80">
        {label.metric} <span className="text-white/40">·</span> <span className="text-white/60">{label.group}</span>
      </p>

      {lens === "occupation" && occupationOption ? (
        <p className="text-[11px] leading-relaxed text-white/40">{t.usMapBasisOccupationNote}</p>
      ) : lens === "personalized" && personalizedOption ? (
        <p className="text-[11px] leading-relaxed text-white/40">{t.usMapBasisPersonalizedNote}</p>
      ) : (
        basis.unit === "individual" && (
          <p className="text-[11px] leading-relaxed text-white/40">
            {t.usMapBasisIndividualNote}{" "}
            <Link href={UNIT_EXPLAINER_HREF} className="text-[#34D399] underline underline-offset-2 hover:text-[#6EE7B7]">
              {t.usMapBasisIndividualNoteLink}
            </Link>
          </p>
        )
      )}

      {forcedOffNotice && <p className="text-[11px] leading-relaxed text-[#FBBF24]/80">{forcedOffNotice}</p>}
    </div>
  );
}
