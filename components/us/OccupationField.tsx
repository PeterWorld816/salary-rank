"use client";
// Searchable "occupation (optional)" picker for UsInputPanel — same
// search-and-select mechanics as PlaceSearchList/CityPickerChip
// (components/us/UsGeoList.tsx), just triggered from an inline field
// instead of a floating summary pill, and seeded from
// data/us/occupationCategories.json's 22 selectable major groups instead of
// a state/county/place list.
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import UsGeoList, { type UsGeoListItem } from "@/components/us/UsGeoList";
import { OCCUPATION_CATEGORIES } from "@/lib/usOccupationIncome";
import type { Localized } from "@/lib/i18n";

export default function OccupationField({
  label,
  overallLabel,
  searchPlaceholder,
  emptyText,
  value,
  onChange,
  tr,
}: {
  label: string;
  overallLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  value: string | null;
  onChange: (id: string | null) => void;
  tr: (l: Localized) => string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const items: UsGeoListItem[] = [
    { id: "", name: overallLabel },
    ...OCCUPATION_CATEGORIES.map((c) => ({ id: c.id, name: tr(c.label) })),
  ];
  const selected = value ? OCCUPATION_CATEGORIES.find((c) => c.id === value) : null;
  const displayText = selected ? tr(selected.label) : overallLabel;

  function handleSelect(id: string) {
    setOpen(false);
    onChange(id === "" ? null : id);
  }

  return (
    <div className="relative">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/40">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-left text-[14px] font-semibold text-white outline-none transition-colors focus:border-[#34D399] focus:bg-white/[0.09]"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[260px] rounded-xl border border-white/10 bg-[#14161A] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
            <UsGeoList
              items={items}
              onSelect={handleSelect}
              searchPlaceholder={searchPlaceholder}
              emptyText={emptyText}
              selectedId={value ?? ""}
              maxHeight={320}
            />
          </div>
        </>
      )}
    </div>
  );
}
