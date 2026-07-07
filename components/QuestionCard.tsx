"use client";
import { useLanguage } from "@/lib/LanguageProvider";
import type { Question, QuestionOption } from "@/data/questions";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function QuestionCard({
  question, step, total, onSelect,
}: {
  question: Question;
  step: number;
  total: number;
  onSelect: (option: QuestionOption) => void;
}) {
  const { tr } = useLanguage();
  const progress = (step / total) * 100;

  return (
    <div className="card p-6 fade-up">
      <div className="flex items-center justify-between mb-4">
        <span className="text-caption font-bold tabular-nums text-accent">
          {step + 1} / {total}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-bg-subtle mb-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h2 className="text-title text-text mb-6">{tr(question.prompt)}</h2>

      <div className="space-y-3">
        {question.options.map((opt, i) => (
          <button key={opt.id} onClick={() => onSelect(opt)} className="option-row text-body text-text">
            <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold bg-accent-tint text-accent">
              {OPTION_LETTERS[i] ?? i + 1}
            </span>
            <span>{tr(opt.label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
