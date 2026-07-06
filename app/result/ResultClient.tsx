"use client";
import { useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { getResultById } from "@/data/results";
import ResultCard from "@/components/ResultCard";
import ShareButtons from "@/components/ShareButtons";

function ResultContent() {
  const sp = useSearchParams();
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);

  const id = sp.get("id") ?? "";
  const result = getResultById(id);

  if (!result) {
    return (
      <main className="min-h-screen bg-[#F5F5F0] font-sans flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display font-bold text-xl mb-2 text-[#0D0D0D]">{t.resultNotFound}</h1>
          <p className="text-sm text-[#6B7280] mb-6">{t.resultNotFoundDesc}</p>
          <Link
            href="/quiz"
            className="inline-block rounded-xl px-5 py-3 text-sm font-semibold bg-[#0D0D0D] text-white"
          >
            {t.retry}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F5F0] font-sans">
      <div className="max-w-sm mx-auto px-4 pt-8 pb-safe">
        <Link href="/quiz" className="inline-flex items-center gap-2 text-sm text-[#6B7280] mb-6 touch-target">
          ← {t.retry}
        </Link>

        <div className="flex justify-center mb-5">
          <div className="shadow-[0_12px_48px_rgba(0,0,0,0.35)] rounded-3xl overflow-hidden">
            <ResultCard result={result} cardRef={cardRef} />
          </div>
        </div>

        <div className="mb-5">
          <ShareButtons
            cardRef={cardRef}
            shareTitle={`${result.emoji} ${result.title}`}
            shareText={`${result.title} — ${result.description}`}
            downloadName={`result-${result.id}.png`}
          />
        </div>

        <p className="text-[10px] text-[#9CA3AF] text-center mb-5">{t.disclaimer}</p>

        <div className="grid grid-cols-2 gap-3 pb-4">
          <Link
            href="/quiz"
            className="card-hover rounded-xl py-3.5 text-center text-xs font-semibold bg-white shadow-sm border border-[#E5E5E0] text-[#0D0D0D]"
          >
            ↩ {t.retry}
          </Link>
          <Link
            href="/"
            className="card-hover rounded-xl py-3.5 text-center text-xs font-semibold bg-white shadow-sm border border-[#E5E5E0] text-[#0D0D0D]"
          >
            🏠 {t.home}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResultClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F0]" />}>
      <ResultContent />
    </Suspense>
  );
}
