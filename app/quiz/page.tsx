"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { questions, type QuestionOption } from "@/data/questions";
import { computeBreakdown, encodeBreakdown } from "@/data/results";
import QuestionCard from "@/components/QuestionCard";

export default function QuizPage() {
  const { t, lang } = useLanguage();
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
    const params = new URLSearchParams({ d: encodeBreakdown(breakdown), lang });
    router.push(`/result?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-bg font-sans">
      <section className="px-6 sm:px-8 pt-12 pb-safe max-w-xl mx-auto fade-up">
        <Link href="/" className="inline-flex items-center gap-1 text-caption text-text-secondary mb-8 touch-target">
          <ChevronLeft className="w-4 h-4" />
          {t.home}
        </Link>

        <QuestionCard
          key={questions[step].id}
          question={questions[step]}
          step={step}
          total={questions.length}
          onSelect={handleSelect}
        />
      </section>
    </main>
  );
}
