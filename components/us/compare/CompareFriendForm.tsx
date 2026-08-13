"use client";
// Compact standalone form for the invite recipient's own answers — deliberately
// not a reuse of UsInputPanel (that component owns the fixed site-wide header
// bar and writes straight to the URL's ?d=, neither of which fits here). Only
// asks for what getMostSpecificIncomePercentile actually needs (income) plus
// the demographic fields kept for parity with the rest of /us's UsInput shape
// — net worth/401(k) are left out of this first pass, see the component's
// call site for why.
import { useState, type ReactNode } from "react";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
import { US_AGE_BANDS, US_GENDERS, US_MARITAL_STATUSES, type UsInput } from "@/lib/usInput";

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
        active
          ? "bg-[#34D399] text-[#04120C]"
          : "border border-white/10 bg-white/[0.06] text-white/70 hover:border-white/25 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function CompareFriendForm({
  locationName,
  onSubmit,
}: {
  locationName: string;
  onSubmit: (input: UsInput) => void;
}) {
  const { t, tr } = useLanguage();
  const [gender, setGender] = useState<UsInput["gender"]>("male");
  const [maritalStatus, setMaritalStatus] = useState<UsInput["maritalStatus"]>("single");
  const [ageBand, setAgeBand] = useState<UsInput["ageBand"]>("25-34");
  const [incomeText, setIncomeText] = useState("");

  const income = Number(incomeText.replace(/\D/g, "")) || null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!income || income <= 0) return;
    onSubmit({ gender, maritalStatus, ageBand, annualIncome: income, netWorth: null, k401: null });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <p className="mb-1 text-[13px] font-semibold text-[#34D399]">
        {formatTemplate(t.usCompareLocationContextTemplate, { location: locationName })}
      </p>
      <h2 className="mb-5 text-[17px] font-bold text-white/90">{t.usCompareFormHeading}</h2>

      <div className="mb-4">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">{t.usFieldGender}</p>
        <div className="flex flex-wrap gap-1.5">
          {US_GENDERS.map((g) => (
            <Pill key={g.id} active={gender === g.id} onClick={() => setGender(g.id)}>
              {tr(g.label)}
            </Pill>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">{t.usFieldMarital}</p>
        <div className="flex flex-wrap gap-1.5">
          {US_MARITAL_STATUSES.map((m) => (
            <Pill key={m.id} active={maritalStatus === m.id} onClick={() => setMaritalStatus(m.id)}>
              {tr(m.label)}
            </Pill>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">{t.usFieldAgeBand}</p>
        <div className="flex flex-wrap gap-1.5">
          {US_AGE_BANDS.map((b) => (
            <Pill key={b.id} active={ageBand === b.id} onClick={() => setAgeBand(b.id)}>
              {tr(b.label)}
            </Pill>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/40">{t.usFieldIncome}</label>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-white/40">$</span>
          <input
            type="text"
            inputMode="numeric"
            value={incomeText}
            onChange={(e) => setIncomeText(e.target.value)}
            placeholder="75,000"
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[14px] font-semibold text-white outline-none transition-colors focus:border-[#34D399] focus:bg-white/[0.09]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!income || income <= 0}
        className="w-full rounded-md bg-[#34D399] py-3 text-[14px] font-semibold text-[#04120C] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t.usCompareFormSubmit}
      </button>
    </form>
  );
}
