"use client";
// The county page's counterpart to MapBasisControl: re-states this county's
// median under whatever "?lens=" the visitor was looking at on the state map,
// so clicking a county doesn't silently swap the number they just saw in the
// tooltip for a different one.
//
// Renders nothing on the household lens — the server-rendered row right above
// this one already IS the county-wide household median, and repeating it under
// a second heading would just look like two conflicting figures.
//
// Reads the query string client-side only, inside its own Suspense boundary.
// app/us/[state]/[county]/page.tsx is ISR'd (revalidate = 86400) and must stay
// that way: a `searchParams` read in that server component — or an unsuspended
// useSearchParams anywhere in its tree — makes Next render it per request and
// drops the cache. Same pattern as CompactResultCard/CompactInsightSection on
// that page.
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatUsd } from "@/lib/usFormat";
import { resolveBasisIncome, type UsIncomeBreakdownSource } from "@/lib/usIncomeCalc";
import { readUsInputFromSearch } from "@/components/us/UsInputPanel";
import { basisForLens, basisLabel, readMapBasisLensFromSearch, UNIT_EXPLAINER_HREF } from "@/components/us/mapBasisLens";

function CountyBasisFigureContent({ county }: { county: UsIncomeBreakdownSource }) {
  const { t, tr } = useLanguage();
  const sp = useSearchParams();

  const input = readUsInputFromSearch(sp);
  const basis = basisForLens(readMapBasisLensFromSearch(sp), input.gender, input.maritalStatus);
  if (basis.axis === "household") return null;

  const reference = resolveBasisIncome(county, basis);
  if (reference.value == null) return null;

  const label = basisLabel(basis, t, tr);

  return (
    <div className="border-b border-white/[0.06] py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-white/55">
          {label.metric} <span className="text-white/30">·</span> <span className="text-white/45">{label.group}</span>
        </span>
        <span className="shrink-0 text-[18px] font-bold tabular-nums text-white">{formatUsd(reference.value)}</span>
      </div>

      {/* Same disclosure the map tooltip makes: this county never published
          the selected breakdown, so the figure above is the county-wide
          household median standing in for it — not a real "single households"
          (or "female earnings") number for this county. */}
      {reference.usedFallback && <p className="mt-1 text-[11px] text-white/35">{t.usMapBasisFallbackTooltip}</p>}

      {basis.unit === "individual" && (
        <p className="mt-1 text-[11px] leading-relaxed text-white/35">
          {t.usMapBasisIndividualNote}{" "}
          <Link href={UNIT_EXPLAINER_HREF} className="text-[#34D399] underline underline-offset-2 hover:text-[#6EE7B7]">
            {t.usMapBasisIndividualNoteLink}
          </Link>
        </p>
      )}
    </div>
  );
}

export default function CountyBasisFigure({ county }: { county: UsIncomeBreakdownSource }) {
  // No visible fallback: on the prerendered HTML this row simply isn't there
  // yet, and an empty-height placeholder avoids a layout jump when it fills in
  // (it sits between two rows that are already in the static markup).
  return (
    <Suspense fallback={null}>
      <CountyBasisFigureContent county={county} />
    </Suspense>
  );
}
