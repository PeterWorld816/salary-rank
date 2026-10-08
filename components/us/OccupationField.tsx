"use client";
// Searchable two-level "occupation (optional)" combobox for UsInputPanel:
// SOC major groups (data/us/occupationCategories.json) as group headings,
// each with an "All <group>" row plus its detailed occupations
// (data/us/occupationDetails.json — chosen by sample size, see
// scripts/buildDetailedEarnings.ts). Typing filters the detailed rows
// directly; a heading stays visible above any of its matches, and typing a
// group's own name shows that whole group (unless individual occupations in
// it match, which then show on their own).
//
// Picking a detailed occupation also sets its major group — map shading is
// major-group only (see UsHomeClient.tsx), so that keeps working unchanged.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { OCCUPATION_CATEGORIES } from "@/lib/usOccupationIncome";
import { OCCUPATION_DETAILS, getOccupationDetail } from "@/lib/usEarningsDetail";
import type { Localized } from "@/lib/i18n";

export type OccupationSelection = { occupation: string | null; occupationDetail: string | null };

type Row =
  | { kind: "header"; key: string; label: string }
  | { kind: "option"; key: string; label: string; value: OccupationSelection; indent: boolean };

export default function OccupationField({
  label,
  overallLabel,
  searchPlaceholder,
  emptyText,
  allOfGroupTemplate,
  value,
  onChange,
  tr,
}: {
  label: string;
  overallLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  allOfGroupTemplate: string; // "{group} (all)"
  value: OccupationSelection;
  onChange: (next: OccupationSelection) => void;
  tr: (l: Localized) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    searchRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Built once per language; filtering below is a plain substring pass over
  // ~150 strings, cheap enough per keystroke.
  const groups = useMemo(
    () =>
      OCCUPATION_CATEGORIES.map((c) => ({
        id: c.id,
        label: tr(c.label),
        details: OCCUPATION_DETAILS.filter((d) => d.majorId === c.id)
          .map((d) => ({ id: d.id, label: tr(d.label), isOther: d.isOther }))
          .sort((a, b) => Number(a.isOther) - Number(b.isOther) || a.label.localeCompare(b.label)),
      })),
    [tr]
  );

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: Row[] = [];
    if (!q || overallLabel.toLowerCase().includes(q))
      out.push({ kind: "option", key: "overall", label: overallLabel, value: { occupation: null, occupationDetail: null }, indent: false });
    for (const g of groups) {
      const groupHit = !q || g.label.toLowerCase().includes(q);
      // Detailed matches win: "architect" should list Architects, not every
      // job under "Architecture & Engineering" just because the group's own
      // name contains the word. The whole group only shows when nothing in
      // it matches individually (e.g. typing "healthcare").
      const matched = q ? g.details.filter((d) => d.label.toLowerCase().includes(q)) : g.details;
      const details = matched.length > 0 ? matched : groupHit ? g.details : [];
      if (!groupHit && details.length === 0) continue;
      out.push({ kind: "header", key: `h-${g.id}`, label: g.label });
      if (groupHit)
        out.push({
          kind: "option",
          key: `all-${g.id}`,
          label: allOfGroupTemplate.replace("{group}", g.label),
          value: { occupation: g.id, occupationDetail: null },
          indent: true,
        });
      for (const d of details)
        out.push({ kind: "option", key: d.id, label: d.label, value: { occupation: g.id, occupationDetail: d.id }, indent: true });
    }
    return out;
  }, [query, groups, overallLabel, allOfGroupTemplate]);

  const selectedDetail = getOccupationDetail(value.occupationDetail);
  const selectedMajor = value.occupation ? OCCUPATION_CATEGORIES.find((c) => c.id === value.occupation) : null;
  const displayText = selectedDetail
    ? tr(selectedDetail.label)
    : selectedMajor
      ? allOfGroupTemplate.replace("{group}", tr(selectedMajor.label))
      : overallLabel;
  const isSelected = (v: OccupationSelection) => v.occupation === value.occupation && v.occupationDetail === value.occupationDetail;

  function choose(v: OccupationSelection) {
    setOpen(false);
    onChange(v);
  }

  return (
    <div className="relative">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/40">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-left text-[14px] font-semibold text-white outline-none transition-colors focus:border-[#34D399] focus:bg-white/[0.09]"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[300px] rounded-xl border border-white/10 bg-[#14161A] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls="occupation-listbox"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const first = rows.find((r) => r.kind === "option");
                  if (first && first.kind === "option") choose(first.value);
                }
              }}
              placeholder={searchPlaceholder}
              className="mb-2 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[14px] text-white outline-none transition-colors focus:border-[#34D399] focus:bg-white/[0.09]"
            />
            <div
              id="occupation-listbox"
              role="listbox"
              className="us-geo-list-scroll overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02]"
              style={{ maxHeight: 340 }}
            >
              {rows.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-white/40">{emptyText}</p>
              ) : (
                rows.map((r) =>
                  r.kind === "header" ? (
                    <p
                      key={r.key}
                      role="presentation"
                      className="sticky top-0 z-[1] bg-[#191C21] px-3 pb-1 pt-2.5 text-[10.5px] font-bold uppercase tracking-wide text-white/40"
                    >
                      {r.label}
                    </p>
                  ) : (
                    <button
                      key={r.key}
                      type="button"
                      role="option"
                      aria-selected={isSelected(r.value)}
                      onClick={() => choose(r.value)}
                      className={`flex min-h-10 w-full items-center border-b border-white/[0.05] py-2 pr-3 text-left text-[13px] transition-colors last:border-0 hover:bg-white/[0.06] hover:text-white ${
                        r.indent ? "pl-5" : "pl-3"
                      } ${isSelected(r.value) ? "bg-[#34D399]/[0.10] text-white" : "text-white/80"}`}
                    >
                      <span className="truncate">{r.label}</span>
                    </button>
                  )
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
