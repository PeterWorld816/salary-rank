"use client";
// Sticky input panel shown above the map on every /us page. Reads/writes the
// "d" query param (lib/usInput.ts) so answers survive /us -> /us/[state] ->
// /us/[state]/[county] navigation, same trick as the Korea quiz's ?d= param.
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/LanguageProvider";
import { genders, maritalStatuses } from "@/lib/salaryCalc";
import { US_AGE_BANDS, buildUsSearchParams, decodeUsInput, type UsInput } from "@/lib/usInput";

const DEFAULT_INPUT: UsInput = {
  gender: "male",
  maritalStatus: "single",
  ageBand: "25-34",
  annualIncome: 75000,
  netWorth: 20000,
  k401: 20000,
};

export function readUsInputFromSearch(sp: URLSearchParams | { get(k: string): string | null }): UsInput {
  return decodeUsInput(sp.get("d") ?? "") ?? DEFAULT_INPUT;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/40">{children}</label>;
}

const fieldClass =
  "w-full rounded-lg bg-white/[0.06] px-3 py-2.5 text-[14px] font-semibold text-white outline-none transition-colors border border-white/10 focus:border-[#34D399] focus:bg-white/[0.09]";

function SelectField({
  label, value, options, onChange,
}: { label: string; value: string; options: { id: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} appearance-none`}>
        {options.map((o) => (
          <option key={o.id} value={o.id} className="bg-[#0D0D0D] text-white">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  label, helper, value, onCommit,
}: { label: string; helper?: string; value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-semibold text-white/40">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={() => {
            const n = Number(text);
            if (Number.isFinite(n) && n >= 0) onCommit(n);
            else setText(String(value));
          }}
          className={fieldClass}
        />
      </div>
      {helper && <p className="mt-1 text-[11px] text-white/35">{helper}</p>}
    </div>
  );
}

export default function UsInputPanel() {
  const { t, tr, lang } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const [form, setForm] = useState<UsInput>(() => readUsInputFromSearch(sp));

  function apply(next: UsInput) {
    setForm(next);
    const params = buildUsSearchParams(next, lang);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div
      className="sticky top-0 z-40 border-b border-white/10 px-4 py-4 backdrop-blur-md sm:px-6"
      style={{ background: "rgba(10,11,13,0.85)" }}
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#34D399]">{t.usInputTitle}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SelectField
            label={t.usFieldGender}
            value={form.gender}
            options={genders.map((g) => ({ id: g.id, label: tr(g.label) }))}
            onChange={(v) => apply({ ...form, gender: v as UsInput["gender"] })}
          />
          <SelectField
            label={t.usFieldMarital}
            value={form.maritalStatus}
            options={maritalStatuses.map((m) => ({ id: m.id, label: tr(m.label) }))}
            onChange={(v) => apply({ ...form, maritalStatus: v as UsInput["maritalStatus"] })}
          />
          <SelectField
            label={t.usFieldAgeBand}
            value={form.ageBand}
            options={US_AGE_BANDS.map((b) => ({ id: b.id, label: tr(b.label) }))}
            onChange={(v) => apply({ ...form, ageBand: v as UsInput["ageBand"] })}
          />
          <NumberField
            label={t.usFieldIncome}
            value={form.annualIncome}
            onCommit={(v) => apply({ ...form, annualIncome: v })}
          />
          <NumberField
            label={t.usFieldNetWorth}
            helper={t.usFieldNetWorthHelper}
            value={form.netWorth}
            onCommit={(v) => apply({ ...form, netWorth: v })}
          />
          <NumberField
            label={t.usFieldK401}
            helper={t.usFieldK401Helper}
            value={form.k401}
            onCommit={(v) => apply({ ...form, k401: v })}
          />
        </div>
      </div>
    </div>
  );
}
