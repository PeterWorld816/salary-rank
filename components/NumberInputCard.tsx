"use client";
import { useState } from "react";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";

export default function NumberInputCard({
  title,
  helper,
  unit,
  presets,
  step,
  total,
  onSubmit,
  onBack,
}: {
  title: string;
  helper: string;
  unit: string;
  presets: number[];
  step: number;
  total: number;
  onSubmit: (value: number) => void;
  onBack?: () => void;
}) {
  const { t } = useLanguage();
  const [value, setValue] = useState("");
  const progress = (step / total) * 100;
  const numeric = Number(value.replace(/[^0-9]/g, ""));
  const isValid = value.trim() !== "" && Number.isFinite(numeric) && numeric > 0;

  function handleSubmit() {
    if (!isValid) return;
    onSubmit(numeric);
  }

  return (
    <div className="card p-6 fade-up">
      <div className="flex items-center justify-between mb-4">
        {onBack ? (
          <button onClick={onBack} className="text-caption text-text-tertiary touch-target">
            {t.formBack}
          </button>
        ) : (
          <span />
        )}
        <span className="text-caption font-bold tabular-nums text-accent">
          {formatTemplate(t.formStepLabel, { step: step + 1, total })}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-bg-subtle mb-6 overflow-hidden">
        <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <h2 className="text-title text-text mb-2">{title}</h2>
      <p className="text-caption text-text-tertiary mb-5">{helper}</p>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="0"
          className="flex-1 rounded-lg px-4 py-3 text-title text-text text-right tabular-nums"
          style={{ border: "1px solid var(--color-border)" }}
        />
        <span className="text-body text-text-secondary shrink-0">{unit}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => setValue(String(p))}
            className="rounded-full px-3 py-1.5 text-caption font-medium bg-accent-tint text-accent"
          >
            {p.toLocaleString()}
          </button>
        ))}
      </div>

      <button onClick={handleSubmit} disabled={!isValid} className="btn btn-primary w-full disabled:opacity-40">
        {t.next}
      </button>
    </div>
  );
}
