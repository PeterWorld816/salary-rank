"use client";
// One-line notes under a map when the visitor has picked a filter the map
// can't show: a detailed occupation (maps shade by SOC major group only) or
// an education level (result-card only, never used for shading).
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
import { useUsInput } from "@/components/us/UsInputContext";
import { getOccupationCategory } from "@/lib/usOccupationIncome";

export default function MapFilterNotes({ showOccupation = true }: { showOccupation?: boolean }) {
  const { t, tr } = useLanguage();
  const { input } = useUsInput();
  const major = getOccupationCategory(input.occupation);
  const notes = [
    showOccupation && input.occupationDetail && major
      ? formatTemplate(t.usOccupationDetailMapNoteTemplate, { group: tr(major.label) })
      : null,
    input.education ? t.usEducationMapNote : null,
  ].filter((n): n is string => Boolean(n));
  if (notes.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-0.5 text-center">
      {notes.map((n) => (
        <p key={n} className="text-[11px] text-[#FBBF24]/70">
          ⓘ {n}
        </p>
      ))}
    </div>
  );
}
