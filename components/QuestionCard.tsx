"use client";
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
  const progress = (step / total) * 100;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold tabular-nums" style={{ color: "#00C805" }}>
          {step + 1} / {total}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-[#F3F4F6] mb-6 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "#00C805" }}
        />
      </div>

      <h2 className="font-display font-bold text-xl mb-6 leading-snug text-[#0D0D0D]">
        {question.prompt}
      </h2>

      <div className="space-y-3">
        {question.options.map((opt, i) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt)}
            className="w-full text-left rounded-2xl border border-[#E5E5E0] bg-[#F5F5F0] px-4 touch-target text-sm font-medium text-[#374151] hover:border-[#00C805] hover:bg-[#F0FDF4] transition-all card-hover flex items-center gap-3"
          >
            <span
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "#00C80518", color: "#00C805" }}
            >
              {OPTION_LETTERS[i] ?? i + 1}
            </span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
