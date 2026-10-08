"use client";
// Fixed header shown on every /us page: a slim always-visible bar (Home +
// brand + collapsed "YOUR INFO" summary chip) that stays pinned to the top of
// the viewport while scrolling, Robinhood-style. Tapping the chip expands the
// full input form in normal document flow below the bar — only that expanded
// state is allowed to scroll away, per design. Answers live in shared React
// state and are encoded into URLs only by explicit share actions.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Home, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import LanguageSelector from "@/components/LanguageSelector";
import { formatUsdCompact } from "@/lib/usFormat";
import {
  US_AGE_BANDS,
  US_GENDERS,
  US_MARITAL_STATUSES,
  isDefaultUsInputSelection,
  type UsInput,
} from "@/lib/usInput";
import OccupationField from "@/components/us/OccupationField";
import { EDUCATION_LEVELS, EXPERIENCE_BANDS, type UsEducationId, type UsExperienceId } from "@/lib/usEarningsDetail";
import { useUsInput } from "@/components/us/UsInputContext";

// Height of the fixed slim bar (collapsed state) — the spacer below it must
// match exactly, or page content would either gap or slide under the bar.
const HEADER_HEIGHT = 64;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/40">{children}</label>;
}

const fieldClass =
  "w-full rounded-lg bg-white/[0.06] px-3 py-2.5 text-[14px] font-semibold text-white outline-none transition-colors border border-white/10 focus:border-[#34D399] focus:bg-white/[0.09]";

function PillGroup({
  label, value, options, onChange,
}: { label: string; value: string; options: { id: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={active}
              className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
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
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="hidden sm:block">
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {options.map((option) => (
          <option key={option.id} value={option.id} className="bg-[#101316] text-white">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function digitsOf(text: string): string {
  return text.replace(/\D/g, "");
}

function formatDigits(digits: string): string {
  return digits ? Number(digits).toLocaleString("en-US") : "";
}

function CurrencyField({
  label, helper, placeholder, value, onCommit,
}: { label: string; helper?: string; placeholder?: string; value: number | null; onCommit: (v: number | null) => void }) {
  const [text, setText] = useState(() => (value == null ? "" : formatDigits(String(Math.round(value)))));

  useEffect(() => {
    setText(value == null ? "" : formatDigits(String(Math.round(value))));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const caret = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = digitsOf(input.value.slice(0, caret)).length;
    const formatted = formatDigits(digitsOf(input.value));

    // Reformatting shifts every digit after the first inserted comma, so the
    // browser's own caret tracking would drift — recompute it from how many
    // digits (not characters) sit to the left of the caret instead.
    input.value = formatted;
    let newCaret = formatted.length;
    if (digitsBeforeCaret === 0) {
      newCaret = 0;
    } else {
      let seen = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/[0-9]/.test(formatted[i])) seen++;
        if (seen === digitsBeforeCaret) {
          newCaret = i + 1;
          break;
        }
      }
    }
    input.setSelectionRange(newCaret, newCaret);
    setText(formatted);
  }

  function handleBlur() {
    const digits = digitsOf(text);
    if (digits === "") {
      // Leaving it blank commits "not provided", not 0 — these fields are
      // optional, and 0 would be a real (wrong) answer, not "unset".
      onCommit(null);
      return;
    }
    const n = Number(digits);
    const committed = Number.isFinite(n) && n >= 0 ? n : (value ?? 0);
    onCommit(committed);
    setText(formatDigits(String(committed)));
  }

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-semibold text-white/40">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={text}
          placeholder={placeholder}
          onChange={handleChange}
          onBlur={handleBlur}
          className={fieldClass}
        />
      </div>
      {helper && <p className="mt-1 text-[11px] text-white/35">{helper}</p>}
    </div>
  );
}

export default function UsInputPanel() {
  const { t, tr } = useLanguage();
  const { input: form, setInput: setForm, setMapLens, panelRequest, requestPanel } = useUsInput();
  const pathname = usePathname();
  const sp = useSearchParams();
  // Keep the first viewport focused on the result card and map. The compact
  // summary chip still exposes the current answers, and the full form stays
  // one tap away for both fresh visits and shared links.
  const [expanded, setExpanded] = useState(false);
  // Net worth/401k start hidden behind their own toggle — most visitors
  // only ever fill in income, so showing two extra optional currency
  // fields by default just adds clutter. A shared link (or a friend
  // challenge) that already carries a value for either one starts
  // expanded instead, so it stays visible rather than hiding data the
  // visitor already entered.
  const [assetsExpanded, setAssetsExpanded] = useState(false);
  // Education/experience live behind their own "More filters" fold so the
  // panel doesn't grow for the majority who never touch them; a shared link
  // that already sets one starts unfolded.
  const [moreFilters, setMoreFilters] = useState(false);
  useEffect(() => {
    if (form.education != null || form.experience != null) setMoreFilters(true);
  }, [form.education, form.experience]);
  useEffect(() => {
    if (form.netWorth != null || form.k401 != null) setAssetsExpanded(true);
  }, [form.netWorth, form.k401]);

  useEffect(() => {
    if (!panelRequest) return;
    setExpanded(true);
    if (panelRequest === "netWorth") setAssetsExpanded(true);
    requestPanel(null);
  }, [panelRequest, requestPanel]);

  // A pending "compare with a friend" challenge (see lib/usInput.ts) lives in
  // its own query param, independent of the in-memory calculator answers.
  const from = sp.get("from");

  function apply(next: UsInput) {
    setForm(next);

    // Changing ANY of gender/marital status/age band/occupation is the
    // moment the map's shading should "just follow" what the visitor asked
    // for — SHADING switches to "Personalized (Your filters)" and stays
    // there (recomputing live) for as long as at least one answer differs
    // from the out-of-the-box default; moving every answer back to default
    // drops it back to "All households". See components/us/mapBasisLens.ts
    // and the nationwide map's Personalized option (UsHomeClient.tsx).
    const personalizableChanged =
      next.gender !== form.gender ||
      next.maritalStatus !== form.maritalStatus ||
      next.ageBand !== form.ageBand ||
      next.occupation !== form.occupation;
    if (personalizableChanged) {
      setMapLens(isDefaultUsInputSelection(next) ? "household" : "personalized");
    }
  }

  const genderLabel = tr(US_GENDERS.find((g) => g.id === form.gender)?.label ?? { ko: "", en: "" });
  const maritalLabel = tr(US_MARITAL_STATUSES.find((m) => m.id === form.maritalStatus)?.label ?? { ko: "", en: "" });
  const ageLabel = tr(US_AGE_BANDS.find((b) => b.id === form.ageBand)?.label ?? { ko: "", en: "" });
  const summary = `${genderLabel} · ${maritalLabel} · ${ageLabel} · ${formatUsdCompact(form.annualIncome)}`;
  // Return to the state-picker map without putting calculator answers in URL.
  const localeBase = pathname.startsWith("/kr") ? "/kr" : "/us";
  const homeHref = from ? `${localeBase}?from=${encodeURIComponent(from)}` : localeBase;

  return (
    <>
      {/* Collapsed: pinned to the viewport top (Robinhood-style top bar) so
          it stays visible while the page scrolls. Expanded: back to a plain
          in-flow block — the spec only requires the *slim* bar to stay
          fixed; once the fields are showing it's fine for content (and the
          panel itself) to scroll normally. */}
      <div
        className={`inset-x-0 top-0 z-40 border-b border-white/10 ${expanded ? "relative" : "fixed"}`}
        style={{ background: "rgba(10,11,13,0.97)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 sm:px-6" style={{ height: HEADER_HEIGHT }}>
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href={homeHref}
              aria-label={t.home}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/65 transition-colors hover:border-[#34D399]/50 hover:bg-[#34D399]/10 hover:text-[#34D399]"
            >
              <Home className="h-5 w-5" />
            </Link>
            <Link href={homeHref} className="group flex shrink-0 items-baseline gap-2">
              <span className="whitespace-nowrap text-[15px] font-extrabold tracking-tight text-white transition-colors group-hover:text-[#34D399] min-[400px]:text-[16px]">
                {t.usAppTitle}
              </span>
              <span className="hidden truncate text-[12px] text-white/40 sm:inline">{t.usMastheadTagline}</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse input panel" : "Expand input panel"}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#34D399]/35 bg-[#34D399]/10 px-2.5 py-1.5 text-left text-[12px] font-semibold text-white/85 transition-colors hover:border-[#34D399]/70 hover:bg-[#34D399]/15 hover:text-white min-[480px]:px-3"
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#34D399]" />
            <span className="hidden min-w-0 flex-col min-[480px]:flex">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#34D399]">{t.usInputTitle}</span>
              <span className="max-w-[250px] truncate text-white/75">{summary}</span>
            </span>
            <span className="text-white/75 min-[480px]:hidden">{formatUsdCompact(form.annualIncome)}</span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {expanded && (
          <div className="mx-auto max-w-5xl px-4 pb-5 sm:px-6">
            <div className="flex flex-col gap-5 border-t border-white/[0.06] pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-bold uppercase tracking-wide text-[#34D399]">{t.usInputTitle}</h2>
                <div className="hidden max-[479px]:block">
                  <LanguageSelector />
                </div>
              </div>

              <div>
                <h3 className="mb-2.5 text-[12px] font-semibold text-white/50">{t.usGroupWho}</h3>
                <div className="grid gap-3 sm:grid-cols-5 sm:gap-4">
                  <div className="sm:hidden">
                    <PillGroup
                      label={t.usFieldGender}
                      value={form.gender}
                      options={US_GENDERS.map((g) => ({ id: g.id, label: tr(g.label) }))}
                      onChange={(v) => apply({ ...form, gender: v as UsInput["gender"] })}
                    />
                  </div>
                  <SelectField
                    label={t.usFieldGender}
                    value={form.gender}
                    options={US_GENDERS.map((g) => ({ id: g.id, label: tr(g.label) }))}
                    onChange={(v) => apply({ ...form, gender: v as UsInput["gender"] })}
                  />
                  <div className="sm:hidden">
                    <PillGroup
                      label={t.usFieldMarital}
                      value={form.maritalStatus}
                      options={US_MARITAL_STATUSES.map((m) => ({ id: m.id, label: tr(m.label) }))}
                      onChange={(v) => apply({ ...form, maritalStatus: v as UsInput["maritalStatus"] })}
                    />
                  </div>
                  <SelectField
                    label={t.usFieldMarital}
                    value={form.maritalStatus}
                    options={US_MARITAL_STATUSES.map((m) => ({ id: m.id, label: tr(m.label) }))}
                    onChange={(v) => apply({ ...form, maritalStatus: v as UsInput["maritalStatus"] })}
                  />
                  <div className="sm:hidden">
                    <PillGroup
                      label={t.usFieldAgeBand}
                      value={form.ageBand}
                      options={US_AGE_BANDS.map((b) => ({ id: b.id, label: tr(b.label) }))}
                      onChange={(v) => apply({ ...form, ageBand: v as UsInput["ageBand"] })}
                    />
                  </div>
                  <SelectField
                    label={t.usFieldAgeBand}
                    value={form.ageBand}
                    options={US_AGE_BANDS.map((b) => ({ id: b.id, label: tr(b.label) }))}
                    onChange={(v) => apply({ ...form, ageBand: v as UsInput["ageBand"] })}
                  />
                  <OccupationField
                    label={t.usFieldOccupation}
                    overallLabel={t.usOccupationOverall}
                    searchPlaceholder={t.usOccupationSearchPlaceholder}
                    emptyText={t.usListNoResults}
                    allOfGroupTemplate={t.usOccupationAllOfGroupTemplate}
                    value={{ occupation: form.occupation, occupationDetail: form.occupationDetail }}
                    onChange={(sel) => apply({ ...form, ...sel })}
                    tr={tr}
                  />
                  <CurrencyField
                    label={t.usFieldIncome}
                    value={form.annualIncome}
                    onCommit={(v) => apply({ ...form, annualIncome: v ?? form.annualIncome })}
                  />
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setMoreFilters((v) => !v)}
                  aria-expanded={moreFilters}
                  className="text-[12px] font-semibold text-white/50 transition-colors hover:text-white"
                >
                  {moreFilters ? t.usMoreFiltersHide : t.usMoreFiltersShow}
                </button>
                {moreFilters && (
                  <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel>{t.usFieldEducation}</FieldLabel>
                      <select
                        value={form.education ?? ""}
                        onChange={(e) => apply({ ...form, education: (e.target.value || null) as UsEducationId | null })}
                        className={fieldClass}
                      >
                        <option value="" className="bg-[#101316] text-white">{t.usFilterNotSet}</option>
                        {EDUCATION_LEVELS.map((e) => (
                          <option key={e.id} value={e.id} className="bg-[#101316] text-white">{tr(e.label)}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-white/35">{t.usEducationMapNote}</p>
                    </div>
                    <div>
                      <FieldLabel>{t.usFieldExperience}</FieldLabel>
                      <select
                        value={form.experience ?? ""}
                        onChange={(e) => apply({ ...form, experience: (e.target.value || null) as UsExperienceId | null })}
                        className={fieldClass}
                      >
                        <option value="" className="bg-[#101316] text-white">{t.usFilterNotSet}</option>
                        {EXPERIENCE_BANDS.map((b) => (
                          <option key={b.id} value={b.id} className="bg-[#101316] text-white">{tr(b.label)}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-white/35">{t.usExperienceEstimatedNote}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setAssetsExpanded((v) => !v)}
                  aria-expanded={assetsExpanded}
                  className="text-[12px] font-semibold text-white/50 transition-colors hover:text-white"
                >
                  {assetsExpanded ? t.usFieldAssetsToggleHide : t.usFieldAssetsToggleShow}
                </button>
                {assetsExpanded && (
                  <div className="mt-2.5">
                    <h3 className="mb-2.5 text-[12px] font-semibold text-white/50">{t.usFieldAssetsSectionTitle}</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <CurrencyField
                        label={t.usFieldNetWorth}
                        helper={t.usFieldNetWorthHelper}
                        placeholder={t.usFieldOptionalPlaceholder}
                        value={form.netWorth}
                        onCommit={(v) => apply({ ...form, netWorth: v })}
                      />
                      <CurrencyField
                        label={t.usFieldK401}
                        helper={t.usFieldK401Helper}
                        placeholder={t.usFieldOptionalPlaceholder}
                        value={form.k401}
                        onCommit={(v) => apply({ ...form, k401: v })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spacer so fixed (collapsed) mode doesn't slide under the page
          content below it — not needed when expanded, since the panel is
          `relative` (in normal flow) there. */}
      {!expanded && <div style={{ height: HEADER_HEIGHT }} aria-hidden />}
    </>
  );
}
