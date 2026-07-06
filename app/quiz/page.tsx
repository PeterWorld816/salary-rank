"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { questions, type QuestionOption } from "@/data/questions";
import { computeBreakdown, encodeBreakdown } from "@/data/results";
import QuestionCard from "@/components/QuestionCard";

export default function QuizPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuestionOption[]>([]);

  const handleSelect = (option: QuestionOption) => {
    const next = [...answers, option];

    if (step < questions.length - 1) {
      setAnswers(next);
      setStep(step + 1);
      return;
    }

    const breakdown = computeBreakdown(next);
    router.push(`/result?d=${encodeURIComponent(encodeBreakdown(breakdown))}`);
  };

  return (
    <main className="min-h-screen bg-[#F5F5F0] font-sans">
      <section className="px-4 sm:px-6 pt-12 pb-safe max-w-xl mx-auto fade-up">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#6B7280] mb-6 touch-target">
          ← {t.home}
        </Link>

        <QuestionCard
          question={questions[step]}
          step={step}
          total={questions.length}
          onSelect={handleSelect}
        />
      </section>
    </main>
  );
}
