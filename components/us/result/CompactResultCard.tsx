"use client";
// The result-card step shared by the home page (nationwide), /us/[state]
// (state), and /us/[state]/[county] (county) — the same tier-colored
// ResultCardVisual design used by PersonalizedResult.tsx's headline, shown
// on screen and rasterized by Save Image from the exact same component/
// props (see ResultCardVisual.tsx's own header comment). See
// useCompactResult.ts for the shared calculation and CompactInsightSection.tsx
// for the coaching-insight card that goes after that map section.
import { Suspense, useRef } from "react";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
import ResultCardVisual, { WIDE_WIDTH, WIDE_HEIGHT } from "@/components/us/ResultCardVisual";
import { siteHost } from "@/components/us/ShareCardBits";
import { filledDotsFromPercent } from "@/lib/decileDots";
import UsInputPanel from "@/components/us/UsInputPanel";
import { NoDataCard } from "@/components/us/result/ResultBits";
import Spinner from "@/components/Spinner";
import ShareButtons from "@/components/ShareButtons";
import type { StateMeta } from "@/data/us/stateMeta";
import type { UsCountyIncome } from "@/lib/usIncomeCalc";
import { useCompactResult, type CompactLevel } from "@/components/us/result/useCompactResult";
import type { Translations } from "@/lib/i18n";
import { useCountUp, useRevealAfterCountUp } from "@/lib/useCountUp";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { getTierAnimationGroup } from "@/lib/tier";
import { formatUsd, stripStateSuffix } from "@/lib/usFormat";

const LEVEL_LABEL_KEY: Record<CompactLevel, keyof Translations> = {
  national: "usNationalPercentileHeroLabel",
  state: "usStatePercentileHeroLabel",
  county: "usCountyPercentileHeroLabel",
};

function CompactResultCardInner({
  presetState,
  presetCounty,
}: {
  presetState: StateMeta | null;
  presetCounty: UsCountyIncome | null;
}) {
  const { t } = useLanguage();
  const result = useCompactResult(presetState, presetCounty);
  const animatedPercent = useCountUp(result.ready ? result.incomePercent : null);
  // ── Tier-branched reveal (see lib/tier.ts's getTierAnimationGroup) — same
  // "wait for the count-up to settle" timing as PersonalizedResult's
  // headline card, keyed off the same incomePercent the number above
  // animates toward. ──
  const revealReady = useRevealAfterCountUp(result.ready ? result.incomePercent : null);
  const reducedMotion = usePrefersReducedMotion();
  const shouldPlayReveal = revealReady && !reducedMotion;
  const revealGroup = result.ready ? getTierAnimationGroup(result.tier) : null;
  const cardRef = useRef<HTMLDivElement>(null);

  // Most-specific geography name available — same fallback order
  // useCompactResult.ts uses internally for its own (unexported)
  // locationName, so this always names whichever level `result.level` is.
  const locationName = presetCounty
    ? stripStateSuffix(presetCounty.name, presetState?.name ?? "")
    : (presetState?.name ?? null);

  const shareTitle = locationName && presetState ? `${t.usAppTitle} — ${locationName}, ${presetState.name}` : t.usAppTitle;
  const shareText = result.ready ? formatTemplate(t.usShareTextTemplate, { percent: result.incomePercent }) : t.usAppTitle;

  const downloadName =
    result.ready && result.level === "county" && presetState && presetCounty
      ? `us-income-${presetState.abbr}-${presetCounty.fips}.png`
      : result.ready && result.level === "state" && presetState
        ? `us-income-${presetState.abbr}.png`
        : "us-income-national.png";

  // ── Values shared verbatim between the on-screen ResultCardVisual and its
  // hidden Save Image capture instance below, so the two can never show
  // different numbers/text for the same result. ──
  const resultCardHost = siteHost();
  const resultCardIncomeValue = result.ready ? `${formatUsd(result.input.annualIncome)} / yr` : "";
  const resultCardBeatText = result.ready ? formatTemplate(t.usShareCardBeatTemplate, { count: filledDotsFromPercent(result.incomePercent) }) : "";
  const resultCardLocationLine = locationName ?? t.usAppTitle;

  return (
    <>
      <UsInputPanel />
      <div className="mx-auto max-w-2xl px-6 pt-8">
        {result.ready ? (
          <>
            <div className="mx-auto w-full" style={{ maxWidth: 480 }}>
              <ResultCardVisual
                variant="wide"
                tier={result.tier}
                percent={result.incomePercent}
                displayPercent={animatedPercent}
                percentTemplate={t.topPercentTemplate}
                subLabel={t[LEVEL_LABEL_KEY[result.level]]}
                locationLine={resultCardLocationLine}
                host={resultCardHost}
                watermarkFallback={t.usAppTitle}
                incomeLabel={t.usShareCardCurrentIncomeLabel}
                incomeValue={resultCardIncomeValue}
                gapLabel={t.usShareCardNextTierLabel}
                gapNote={result.gapNote}
                beatText={resultCardBeatText}
                play={shouldPlayReveal}
                pulse={shouldPlayReveal && revealGroup === "encourage"}
              />
            </div>

            {/* ── Hidden capture instance — same component, same props as
                the visible card above, pinned to its fixed design pixel
                width so Save Image keeps producing a correctly-scaled
                1200x630 asset regardless of how the on-screen card is
                currently scaled. ── */}
            <div className="pointer-events-none absolute left-[-9999px] top-0 overflow-hidden" aria-hidden>
              <div style={{ width: `${WIDE_WIDTH}px` }}>
                <ResultCardVisual
                  variant="wide"
                  cardRef={cardRef}
                  tier={result.tier}
                  percent={result.incomePercent}
                  percentTemplate={t.topPercentTemplate}
                  subLabel={t[LEVEL_LABEL_KEY[result.level]]}
                  locationLine={resultCardLocationLine}
                  host={resultCardHost}
                  watermarkFallback={t.usAppTitle}
                  incomeLabel={t.usShareCardCurrentIncomeLabel}
                  incomeValue={resultCardIncomeValue}
                  gapLabel={t.usShareCardNextTierLabel}
                  gapNote={result.gapNote}
                  beatText={resultCardBeatText}
                />
              </div>
            </div>

            <div className="mx-auto mt-4 w-full" style={{ maxWidth: 480 }}>
              <ShareButtons
                cardRef={cardRef}
                width={WIDE_WIDTH}
                height={WIDE_HEIGHT}
                shareTitle={shareTitle}
                shareText={shareText}
                downloadName={downloadName}
              />
            </div>
          </>
        ) : (
          <NoDataCard title={t.usCountyNoDataTitle} desc={t.usCountyNoDataDesc} />
        )}
      </div>
    </>
  );
}

export default function CompactResultCard(props: { presetState: StateMeta | null; presetCounty: UsCountyIncome | null }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-8">
          <Spinner className="h-6 w-6 border-[3px] border-white/20 border-t-[#34D399]" />
        </div>
      }
    >
      <CompactResultCardInner {...props} />
    </Suspense>
  );
}
