"use client";
// The result-card step shared by the home page (nationwide), /us/[state]
// (state), and /us/[state]/[county] (county) — the same tier-colored
// ResultCardVisual design used by PersonalizedResult.tsx's headline, shown
// on screen and rasterized by Save Image from the exact same component/
// props (see ResultCardVisual.tsx's own header comment). See
// useCompactResult.ts for the shared calculation and CompactInsightSection.tsx
// for the coaching-insight card that goes after that map section.
import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import ResultCardVisual, { CARD_PREVIEW_MAX_WIDTH, WIDE_WIDTH, WIDE_HEIGHT } from "@/components/us/ResultCardVisual";
import UsInputPanel from "@/components/us/UsInputPanel";
import { NoDataCard } from "@/components/us/result/ResultBits";
import Spinner from "@/components/Spinner";
import ShareButtons from "@/components/ShareButtons";
import type { StateMeta } from "@/data/us/stateMeta";
import type { UsCountyIncome } from "@/lib/usIncomeCalc";
import { useCompactResult } from "@/components/us/result/useCompactResult";
import { formatUsd, stripStateSuffix } from "@/lib/usFormat";
import { buildUsShareHref, US_AGE_BANDS } from "@/lib/usInput";
import { receiptRankFromPercent, receiptShareText } from "@/lib/receiptCard";

function CompactResultCardInner({
  presetState,
  presetCounty,
  shareAfterMapId,
}: {
  presetState: StateMeta | null;
  presetCounty: UsCountyIncome | null;
  shareAfterMapId?: string;
}) {
  const { t, lang } = useLanguage();
  const base = useLocaleBase();
  const result = useCompactResult(presetState, presetCounty);
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareTarget, setShareTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!shareAfterMapId) return;
    setShareTarget(document.getElementById(shareAfterMapId));
  }, [shareAfterMapId]);

  // Most-specific geography name available — same fallback order
  // useCompactResult.ts uses internally for its own (unexported)
  // locationName, so this always names whichever level `result.level` is.
  const locationName = presetCounty
    ? stripStateSuffix(presetCounty.name, presetState?.name ?? "")
    : (presetState?.name ?? null);

  const shareTitle = locationName && presetState ? `${t.usAppTitle} — ${locationName}, ${presetState.name}` : t.usAppTitle;
  const shareText = result.ready ? receiptShareText(receiptRankFromPercent(result.nationalPercentile)) : t.usAppTitle;
  const getShareUrl = () => {
    const shareUrl = new URL(buildUsShareHref(base, new URLSearchParams(), result.input, lang), window.location.origin);
    if (presetState) shareUrl.searchParams.set("st", presetState.abbr);
    return `${shareUrl.pathname}${shareUrl.search}`;
  };

  const downloadName =
    result.ready && result.level === "county" && presetState && presetCounty
      ? `us-income-${presetState.abbr}-${presetCounty.fips}.png`
      : result.ready && result.level === "state" && presetState
        ? `us-income-${presetState.abbr}.png`
        : "us-income-national.png";

  // Only the age-band benchmark exists in the published nationwide data;
  // gender-by-age percentiles are omitted rather than estimated.
  const ageBand = US_AGE_BANDS.find((band) => band.id === result.input.ageBand);
  const ageLabel = ageBand ? (lang === "ko" ? ageBand.label.ko : ageBand.label.en) : result.input.ageBand;
  const receiptRows =
    result.ready
      ? [
          {
            label: "NATIONWIDE",
            percent: result.nationalPercentile,
          },
          result.ageIncomePercentile != null && {
            label: `AGE BAND · ${ageLabel.toUpperCase()}`,
            percent: result.ageIncomePercentile,
          },
          result.statePercentile != null && presetState && {
            label: `STATE · ${presetState.abbr}`,
            percent: result.statePercentile,
          },
        ].filter((line): line is { label: string; percent: number } => Boolean(line))
      : [];

  return (
    <>
      <UsInputPanel />
      <div className="mx-auto max-w-2xl px-6 pt-8">
        {result.ready ? (
          <>
            <div className="mx-auto w-full" style={{ maxWidth: CARD_PREVIEW_MAX_WIDTH }}>
              <ResultCardVisual
                variant="wide"
                percent={result.nationalPercentile}
                rows={receiptRows}
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
                  percent={result.nationalPercentile}
                  rows={receiptRows}
                />
              </div>
            </div>

            {shareTarget
              ? createPortal(
                  <div className="mx-auto w-full" style={{ maxWidth: CARD_PREVIEW_MAX_WIDTH }}>
                    <ShareButtons
                      cardRef={cardRef}
                      width={WIDE_WIDTH}
                      height={WIDE_HEIGHT}
                      shareTitle={shareTitle}
                      shareText={shareText}
                      getShareUrl={getShareUrl}
                      downloadName={downloadName}
                    />
                  </div>,
                  shareTarget
                )
              : !shareAfterMapId && (
                  <div className="mx-auto mt-4 w-full" style={{ maxWidth: CARD_PREVIEW_MAX_WIDTH }}>
                    <ShareButtons
                      cardRef={cardRef}
                      width={WIDE_WIDTH}
                      height={WIDE_HEIGHT}
                      shareTitle={shareTitle}
                      shareText={shareText}
                      getShareUrl={getShareUrl}
                      downloadName={downloadName}
                    />
                  </div>
                )}
          </>
        ) : (
          <NoDataCard title={t.usCountyNoDataTitle} desc={t.usCountyNoDataDesc} />
        )}
      </div>
    </>
  );
}

export default function CompactResultCard(props: {
  presetState: StateMeta | null;
  presetCounty: UsCountyIncome | null;
  shareAfterMapId?: string;
}) {
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
