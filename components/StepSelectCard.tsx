"use client";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";

export type StepOption = { id: string; label: string };

export default function StepSelectCard({
  title,
  options,
  step,
  total,
  onSelect,
  onBack,
  footer,
}: {
  title: string;
  options: StepOption[];
  step: number;
  total: number;
  onSelect: (id: string) => void;
  onBack?: () => void;
  footer?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const progress = (step / total) * 100;

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
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h2 className="text-title text-text mb-6">{title}</h2>

      <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
        {options.map((opt) => (
          <button key={opt.id} onClick={() => onSelect(opt.id)} className="option-row text-body text-text">
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}
