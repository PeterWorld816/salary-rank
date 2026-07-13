"use client";
import { useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, RotateCcw, Home } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate, formatCurrency, SOURCE_URL } from "@/lib/i18n";
import {
  decodeSalaryInput,
  computeSalaryRank,
  getAgeGroup,
  getIndustry,
  getRegion,
} from "@/lib/salaryCalc";
import { getJobVibe } from "@/data/jobVibe";
import { buildResultShareText } from "@/lib/shareText";
import ResultCard, { CARD_WIDTH, CARD_HEIGHT } from "@/components/ResultCard";
import DistributionChart from "@/components/DistributionChart";
import ShareButtons from "@/components/ShareButtons";
import PageLoading from "@/components/PageLoading";

function ComparisonRow({ label, sub, percentText }: { label: string; sub: string; percentText: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <div className="text-body text-text font-medium">{label}</div>
        <div className="text-caption text-text-tertiary">{sub}</div>
      </div>
      <div className="text-title text-accent font-bold tabular-nums">{percentText}</div>
    </div>
  );
}

function VibeBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-caption text-text-secondary w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-bg-subtle overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-caption font-semibold text-text w-8 text-right">{value}/5</span>
    </div>
  );
}

function ResultContent() {
  const sp = useSearchParams();
  const { t, tr, lang } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);

  const d = sp.get("d") ?? "";
  const input = decodeSalaryInput(d);

  if (!input) {
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

  const rankResult = computeSalaryRank(input);
  const vibe = getJobVibe(input.industry);
  const { title: shareTitle, description: shareText } = buildResultShareText(lang, input, rankResult);

  const ageLabel = tr(getAgeGroup(input.ageGroup).label);
  const industryLabel = tr(getIndustry(input.industry).label);
  const regionLabel = tr(getRegion(input.region).label);

  const fmtTop = (percent: number) => formatTemplate(t.topPercentTemplate, { percent });

  return (
    <main className="min-h-screen bg-bg font-sans">
      <div className="max-w-md mx-auto px-6 pt-10 pb-safe fade-up">
        <Link href="/quiz" className="inline-flex items-center gap-1 text-caption text-text-secondary mb-8 touch-target">
          <ChevronLeft className="w-4 h-4" />
          {t.retry}
        </Link>

        {/* 상위 % 히어로 */}
        <div className="text-center mb-8">
          <p className="text-caption text-text-secondary mb-1">{t.percentileHeroLabel}</p>
          <p className="text-accent font-extrabold" style={{ fontSize: "64px", lineHeight: 1 }}>
            {rankResult.percentileRounded}%
          </p>
          <p className="text-body text-text-secondary mt-3">
            {formatTemplate(t.monthlyRangeTemplate, {
              min: formatCurrency(rankResult.monthly.min, lang),
              max: formatCurrency(rankResult.monthly.max, lang),
            })}
          </p>
          <p className="text-caption text-text-tertiary mt-1">
            {formatTemplate(t.annualEstimateTemplate, { value: formatCurrency(rankResult.annual.estimate, lang) })}
          </p>
        </div>

        {/* 분포 그래프 */}
        <div className="card p-5 mb-4 flex flex-col items-center">
          <h2 className="text-title text-text mb-3 self-start">{t.distributionTitle}</h2>
          <DistributionChart monthlySalary={rankResult.monthly.estimate} width={280} lang={lang} />
        </div>

        {/* 여러 각도로 비교 */}
        <div className="card p-5 mb-4">
          <h2 className="text-title text-text mb-1">{t.comparisonTitle}</h2>
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            <ComparisonRow label={t.comparisonAge} sub={ageLabel} percentText={fmtTop(rankResult.groupComparisons.ageGroup)} />
            <ComparisonRow label={t.comparisonIndustry} sub={industryLabel} percentText={fmtTop(rankResult.groupComparisons.industry)} />
            <ComparisonRow label={t.comparisonRegion} sub={regionLabel} percentText={fmtTop(rankResult.groupComparisons.region)} />
          </div>
        </div>

        {/* 직업 MZ 지수 */}
        <div className="card p-5 mb-4">
          <h2 className="text-title text-text mb-1">{t.jobVibeTitle}</h2>
          <p className="text-caption text-text-tertiary mb-4">{t.jobVibeDisclaimer}</p>
          <div className="space-y-2.5">
            <VibeBar label={t.jobVibeWlb} value={vibe.wlb} />
            <VibeBar label={t.jobVibeGrowth} value={vibe.growth} />
            <VibeBar label={t.jobVibeHip} value={vibe.hip} />
          </div>
          <p className="text-caption text-text-secondary mt-4">{tr(vibe.tagline)}</p>
        </div>

        {/* 데이터 출처 */}
        <div className="rounded-md bg-bg-subtle px-4 py-3 mb-8 text-center">
          <p className="text-caption text-text-secondary font-medium">
            {t.sourceLabel}:{" "}
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-accent"
            >
              {t.sourceText}
            </a>
          </p>
          <p className="text-caption text-text-tertiary mt-1">{t.sourceNote}</p>
        </div>

        <p className="text-caption text-text-tertiary text-center mb-2">🔒 {t.privacyNotice}</p>

        {/* 공유용 카드 */}
        <div className="flex justify-center mb-6">
          <div className="shadow-[0_12px_48px_rgba(0,0,0,0.35)] rounded-3xl overflow-hidden">
            <ResultCard input={input} rankResult={rankResult} cardRef={cardRef} lang={lang} />
          </div>
        </div>

        <div className="mb-6">
          <ShareButtons
            cardRef={cardRef}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            shareTitle={shareTitle}
            shareText={shareText}
            downloadName={`salary-rank-top-${rankResult.percentileRounded}.png`}
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
