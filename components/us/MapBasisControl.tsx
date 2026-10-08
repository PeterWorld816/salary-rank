"use client";
// The "what am I looking at?" pieces of a choropleth card, in two halves:
//   - MapBasisControl (default export): the SHADING segmented control above
//     the map, picking which median the map shades by.
//   - MapBasisCaption: below the map, the plain-language name of the current
//     basis ("Median income · Single households") as the title of the color
//     legend, plus the unit/fallback note that goes with it.
// Split so the map itself can sit right under the tabs instead of under
// several lines of explanation.
//
// The options come from the visitor's own answers in the input panel rather
// than being free-form — the map's job is to re-cut the same county data along
// an axis the visitor already told us about, not to become a second data
// browser. Gender is the exception: Men and Women are both always offered,
// since both halves of the split are published. The lens codec, the priority
// rule, and the label wording all live in components/us/mapBasisLens.ts,
// shared with the county page.
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
import { US_MARITAL_STATUSES, type UsMaritalStatusId } from "@/lib/usInput";
import type { UsIncomeBasis } from "@/lib/usIncomeCalc";
import { basisLabel, UNIT_EXPLAINER_HREF, type UsMapBasisLens } from "@/components/us/mapBasisLens";

// Extra "SHADING" button for the visitor's currently selected occupation —
// only the nationwide map ever passes this (see UsHomeClient.tsx); the state
// map never does, since county-level occupation data isn't reliable (see
// lib/usOccupationIncome.ts) and so never offers the option at all.
type OccupationOption = { label: string } | null;

// "Personalized (Your filters)" — the visitor's whole answer set combined (see
// mapBasisLens.ts's UsMapBasisLens comment). Like occupationOption, only the
// nationwide map ever passes this; fully composed upstream (UsHomeClient.tsx)
// since building its label means reaching into pieces (occupation, age band,
// marital/gender) this component doesn't otherwise need to know about.
type PersonalizedOption = { tabLabel: string; metric: string; group: string } | null;

export default function MapBasisControl({
  lens,
  onLensChange,
  maritalStatus,
  occupationOption,
  personalizedOption,
  forcedOffNotice,
}: {
  lens: UsMapBasisLens;
  onLensChange: (lens: UsMapBasisLens) => void;
  maritalStatus: UsMaritalStatusId;
  occupationOption?: OccupationOption;
  personalizedOption?: PersonalizedOption;
  // Shown when the visitor arrives here (a state's county map) with the
  // occupation or personalized lens still selected from the home map —
  // explains why the map fell back to all-households rather than silently
  // ignoring it.
  forcedOffNotice?: string | null;
}) {
  const { t, tr } = useLanguage();
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    const revealActiveTab = (behavior: ScrollBehavior) => {
      const activeTab = Array.from(tabs.children).find(
        (child): child is HTMLElement =>
          child instanceof HTMLElement && child.getAttribute("data-map-basis-lens") === lens
      );
      if (!activeTab) return;

      const tabLeft = activeTab.offsetLeft;
      const tabRight = tabLeft + activeTab.offsetWidth;
      if (tabLeft < tabs.scrollLeft) {
        tabs.scrollTo({ left: tabLeft, behavior });
      } else if (tabRight > tabs.scrollLeft + tabs.clientWidth) {
        tabs.scrollTo({ left: tabRight - tabs.clientWidth, behavior });
      }
    };

    revealActiveTab("smooth");
    const resizeObserver = new ResizeObserver(() => revealActiveTab("auto"));
    resizeObserver.observe(tabs);
    return () => resizeObserver.disconnect();
  }, [lens, occupationOption?.label, personalizedOption?.tabLabel]);

  const maritalLabel = tr(US_MARITAL_STATUSES.find((m) => m.id === maritalStatus)?.label ?? { ko: "", en: "" });

  // The marital button names the visitor's own answer, so it reads the same
  // whichever tab is currently active.
  const options: { id: UsMapBasisLens; label: string }[] = [
    { id: "household", label: t.usMapBasisOptionHousehold },
    { id: "marital", label: formatTemplate(t.usMapBasisOptionMaritalTemplate, { status: maritalLabel }) },
    { id: "men", label: t.usMapBasisOptionMen },
    { id: "women", label: t.usMapBasisOptionWomen },
    ...(occupationOption ? [{ id: "occupation" as const, label: occupationOption.label }] : []),
    ...(personalizedOption ? [{ id: "personalized" as const, label: personalizedOption.tabLabel }] : []),
  ];

  return (
    <div className="mb-2 flex flex-col gap-2 px-1">
      <div className="flex items-center gap-2 sm:flex-wrap sm:gap-x-3 sm:gap-y-2">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-white/40">{t.usMapBasisHeading}</span>
        {/* Mobile: a horizontally scrollable single row with a fade hint at
            the trailing edge and a >=40px tap target per pill. sm+ reverts to
            a wrapping row. */}
        <div className="relative -mr-1 min-w-0 flex-1 sm:mr-0 sm:flex-none">
          <div
            ref={tabsRef}
            className="flex gap-1.5 overflow-x-auto pr-9 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pr-0 [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label={t.usMapBasisHeading}
          >
            {options.map((o) => {
              const active = o.id === lens;
              return (
                <button
                  key={o.id}
                  data-map-basis-lens={o.id}
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
            className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-end bg-gradient-to-l from-[#0d0f11] via-[#0d0f11]/90 to-transparent pr-1 text-white/50 sm:hidden"
            aria-hidden
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {forcedOffNotice && <p className="text-[11px] leading-relaxed text-[#FBBF24]/80">{forcedOffNotice}</p>}
    </div>
  );
}

export function MapBasisCaption({
  lens,
  basis,
  occupationOption,
  personalizedOption,
  children,
}: {
  lens: UsMapBasisLens;
  // Passed in rather than recomputed here so the label can never disagree
  // with the values the map was actually painted from.
  basis: UsIncomeBasis;
  occupationOption?: OccupationOption;
  personalizedOption?: PersonalizedOption;
  // The color legend (IncomeLegend), shown between the title and the note.
  children?: React.ReactNode;
}) {
  const { t, tr } = useLanguage();

  // Occupation and Personalized aren't UsIncomeBasis axes (see
  // mapBasisLens.ts), so `basis` itself never describes either one — build
  // the label by hand while they're active rather than mislabeling the map
  // as "All households" while it's actually shaded by something else.
  const label =
    lens === "occupation" && occupationOption
      ? { metric: t.usMapBasisMetricIndividual, group: occupationOption.label }
      : lens === "personalized" && personalizedOption
        ? { metric: personalizedOption.metric, group: personalizedOption.group }
        : basisLabel(basis, t, tr);

  return (
    <div className="mt-3 flex flex-col gap-2 px-1">
      <p aria-live="polite" className="text-[13px] font-semibold text-white/85">
        {label.metric} <span className="text-white/40">·</span> <span className="text-white/65">{label.group}</span>
      </p>

      {children}

      {lens === "occupation" && occupationOption ? (
        <p className="text-[11px] leading-relaxed text-white/50">{t.usMapBasisOccupationNote}</p>
      ) : lens === "personalized" && personalizedOption ? (
        <p className="text-[11px] leading-relaxed text-white/50">{t.usMapBasisPersonalizedNote}</p>
      ) : (
        basis.unit === "individual" && (
          <p className="text-[11px] leading-relaxed text-white/50">
            {t.usMapBasisIndividualNote}{" "}
            <Link href={UNIT_EXPLAINER_HREF} className="text-[#34D399] underline underline-offset-2 hover:text-[#6EE7B7]">
              {t.usMapBasisIndividualNoteLink}
            </Link>
          </p>
        )
      )}
    </div>
  );
}
