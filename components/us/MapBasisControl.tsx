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
}: {
  lens: UsMapBasisLens;
  onLensChange: (lens: UsMapBasisLens) => void;
  // Passed in rather than recomputed here so the label can never disagree
  // with the values the map was actually painted from.
  basis: UsIncomeBasis;
  gender: UsGenderId;
  maritalStatus: UsMaritalStatusId;
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
  ];

  const label = basisLabel(basis, t, tr);

  return (
    <div className="mb-3 flex flex-col gap-2 px-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{t.usMapBasisHeading}</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.usMapBasisHeading}>
          {options.map((o) => {
            const active = o.id === lens;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onLensChange(o.id)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
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
      </div>

      <p aria-live="polite" className="text-[13px] font-semibold text-white/80">
        {label.metric} <span className="text-white/40">·</span> <span className="text-white/60">{label.group}</span>
      </p>

      {basis.unit === "individual" && (
        <p className="text-[11px] leading-relaxed text-white/40">
          {t.usMapBasisIndividualNote}{" "}
          <Link href={UNIT_EXPLAINER_HREF} className="text-[#34D399] underline underline-offset-2 hover:text-[#6EE7B7]">
            {t.usMapBasisIndividualNoteLink}
          </Link>
        </p>
      )}
    </div>
  );
}
