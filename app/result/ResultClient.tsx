"use client";
import { useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, RotateCcw, Home } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { decodeBreakdown } from "@/data/results";
import { buildResultShareText } from "@/lib/shareText";
import ResultCard, { CARD_WIDTH, BREAKDOWN_CARD_HEIGHT } from "@/components/ResultCard";
import ShareButtons from "@/components/ShareButtons";
import PageLoading from "@/components/PageLoading";

function ResultContent() {
  const sp = useSearchParams();
  const { t, lang } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);

  const d = sp.get("d") ?? "";
  const breakdown = decodeBreakdown(d);
  const top = breakdown[0];

  if (!top) {
    return (
      <main className="min-h-screen bg-bg font-sans flex items-center justify-center px-6">
        <div className="text-center fade-up">
          <h1 className="text-title text-text mb-2">{t.resultNotFound}</h1>
          <p className="text-body text-text-secondary mb-8">{t.resultNotFoundDesc}</p>
          <Link href="/quiz" className="btn btn-primary">
            {t.retry}
          </Link>
        </div>
      </main>
    );
  }

  const { title: shareTitle, description: shareText } = buildResultShareText(lang, breakdown);

  return (
    <main className="min-h-screen bg-bg font-sans">
      <div className="max-w-sm mx-auto px-6 pt-10 pb-safe fade-up">
        <Link href="/quiz" className="inline-flex items-center gap-1 text-caption text-text-secondary mb-8 touch-target">
          <ChevronLeft className="w-4 h-4" />
          {t.retry}
        </Link>

        <div className="flex justify-center mb-8">
          <div className="shadow-[0_12px_48px_rgba(0,0,0,0.35)] rounded-3xl overflow-hidden">
            <ResultCard breakdown={breakdown} cardRef={cardRef} lang={lang} />
          </div>
        </div>

        <div className="mb-6">
          <ShareButtons
            cardRef={cardRef}
            width={CARD_WIDTH}
            height={BREAKDOWN_CARD_HEIGHT}
            shareTitle={shareTitle}
            shareText={shareText}
            downloadName={`brain-result-${top.result.id}.png`}
          />
        </div>

        <p className="text-caption text-text-tertiary text-center mb-6">{t.disclaimer}</p>

        <div className="grid grid-cols-2 gap-4 pb-4">
          <Link href="/quiz" className="btn btn-secondary">
            <RotateCcw className="w-4 h-4" />
            {t.retry}
          </Link>
          <Link href="/" className="btn btn-secondary">
            <Home className="w-4 h-4" />
            {t.home}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResultClient() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ResultContent />
    </Suspense>
  );
}
