"use client";
// Compact pill that swaps the dashboard's old always-expanded "choose a
// city" section for a popover — clicking it drops PlaceSearchList down in
// place (absolute position, doesn't push the rest of the page) instead of
// permanently occupying a full card in the scroll flow.
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import PlaceSearchList from "@/components/us/PlaceSearchList";
import type { UsGeoListItem } from "@/components/us/UsGeoList";

export default function CityPickerChip({
  label,
  items,
  onSelect,
  searchPlaceholder,
  emptyText,
  ariaLabel,
}: {
  label: string;
  items: UsGeoListItem[];
  onSelect: (placeFips: string) => void;
  searchPlaceholder: string;
  emptyText: string;
  ariaLabel: string;
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

  function handleSelect(placeFips: string) {
    setOpen(false);
    onSelect(placeFips);
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
      >
        <span className="max-w-[200px] truncate">📍 {label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Full-screen transparent backdrop — closes the popover on any
              outside click/tap without a document-level listener. */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/10 bg-[#14161A] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
            <PlaceSearchList
              items={items}
              onSelect={handleSelect}
              searchPlaceholder={searchPlaceholder}
              emptyText={emptyText}
            />
          </div>
        </>
      )}
    </div>
  );
}
