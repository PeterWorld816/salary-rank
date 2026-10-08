"use client";
// The result-card step shared by the home page (nationwide), /us/[state]
// (state), and /us/[state]/[county] (county). The ordinary result stays a
// percentile headline and distribution chart; the shield card only appears
// after a share/save action opens the modal. See useCompactResult.ts for the
// shared calculation and CompactInsightSection.tsx for the coaching insight.
import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import ShieldShareCard, { STORY_WIDTH, STORY_HEIGHT, WIDE_WIDTH, WIDE_HEIGHT } from "@/components/us/ShieldShareCard";
import UsShareCardStory from "@/components/us/UsShareCardStory";
import DistributionChart from "@/components/DistributionChart";
import UsInputPanel from "@/components/us/UsInputPanel";
import { NoDataCard } from "@/components/us/result/ResultBits";
import Spinner from "@/components/Spinner";
import ShareButtons from "@/components/ShareButtons";
import type { StateMeta } from "@/data/us/stateMeta";
import type { UsCountyIncome } from "@/lib/usIncomeCalc";
import { useCompactResult } from "@/components/us/result/useCompactResult";
import { stripStateSuffix } from "@/lib/usFormat";
import { buildUsShareHref, US_AGE_BANDS } from "@/lib/usInput";
import { shieldShareImagePath, shieldShareText } from "@/lib/shieldShare";
import { formatTemplate } from "@/lib/i18n";

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
  const storyCardRef = useRef<HTMLDivElement>(null);
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
  const shareText = result.ready ? shieldShareText(result.nationalPercentile) : t.usAppTitle;
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
  const shareRows =
    result.ready
      ? [
          {
            label: "NATIONWIDE",
            percent: result.nationalPercentile,
          },
          result.ageIncomePercentile != null && {
            label: `AGE ${ageLabel.toUpperCase()}`,
            percent: result.ageIncomePercentile,
          },
          result.statePercentile != null && presetState && {
            label: `IN ${presetState.name.toUpperCase()}`,
            percent: result.statePercentile,
          },
        ].filter((line): line is { label: string; percent: number } => Boolean(line))
      : [];
  const shareImageSummary = result.ready
    ? {
        percent: result.nationalPercentile,
        age: result.input.ageBand,
        agePercent: result.ageIncomePercentile ?? undefined,
        state: presetState?.abbr.toUpperCase(),
        statePercent: presetState ? result.statePercentile ?? undefined : undefined,
      }
    : null;
  const shareLocation = locationName && presetState ? `${locationName}, ${presetState.abbr.toUpperCase()}` : presetState?.abbr.toUpperCase() ?? "United States";
  const cardPreview = (
    <ShieldShareCard
      variant="wide"
      percent={result.ready ? result.nationalPercentile : null}
      rows={shareRows}
      location={shareLocation}
      cardRef={cardRef}
    />
  );
  const storyPreview = (
    <UsShareCardStory
      percent={result.ready ? result.nationalPercentile : null}
      rows={shareRows}
      location={shareLocation}
      cardRef={storyCardRef}
    />
  );

  return (
    <>
      <UsInputPanel />
      <div className="mx-auto max-w-2xl px-6 pt-8">
        {result.ready ? (
          <>
            <div className="mx-auto mb-8 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-center text-[13px] font-semibold text-white/55">
                {formatTemplate(t.topPercentTemplate, { percent: result.incomePercent })}
              </p>
              <h2 className="mt-1 text-center text-[22px] font-extrabold leading-tight text-white">
                {formatTemplate(t.usDashboardHeadlineSingleTemplate, {
                  bestLabel:
                    result.level === "county"
                      ? formatTemplate(t.usRankScopeCountyTemplate, {
                          county: locationName ?? "",
                          state: presetState?.name ?? "",
                        })
                      : result.level === "state"
                        ? formatTemplate(t.usRankScopeStateTemplate, { state: presetState?.name ?? "" })
                        : t.usRankScopeNational,
                })}
              </h2>
              <div className="mt-4 flex justify-center">
                <DistributionChart
                  monthlySalary={result.input.annualIncome}
                  width={280}
                  lang={lang}
                  dark
                  min={15000}
                  max={500000}
                  averageValue={result.medianForChart}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-white/35">
                {formatTemplate(t.usAcs5YearLabel, { range: "2019–2023" })}
              </p>
            </div>

            {shareTarget
              ? createPortal(
                  <div className="mx-auto w-full" style={{ maxWidth: 440 }}>
                    <ShareButtons
                      cardRef={cardRef}
                      storyCardRef={storyCardRef}
                      width={WIDE_WIDTH}
                      height={WIDE_HEIGHT}
                      storyWidth={STORY_WIDTH}
                      storyHeight={STORY_HEIGHT}
                      shareTitle={shareTitle}
                      shareText={shareText}
                      getShareUrl={getShareUrl}
                      downloadName={downloadName}
                      storyDownloadName={`story-${downloadName}`}
                      cardPreview={cardPreview}
                      storyPreview={storyPreview}
                      downloadImageUrl={shareImageSummary ? shieldShareImagePath(shareImageSummary) : undefined}
                      downloadStoryUrl={shareImageSummary ? shieldShareImagePath(shareImageSummary, "story") : undefined}
                    />
                  </div>,
                  shareTarget
                )
              : !shareAfterMapId && (
                  <div className="mx-auto mt-4 w-full" style={{ maxWidth: 440 }}>
                    <ShareButtons
                      cardRef={cardRef}
                      storyCardRef={storyCardRef}
                      width={WIDE_WIDTH}
                      height={WIDE_HEIGHT}
                      storyWidth={STORY_WIDTH}
                      storyHeight={STORY_HEIGHT}
                      shareTitle={shareTitle}
                      shareText={shareText}
                      getShareUrl={getShareUrl}
                      downloadName={downloadName}
                      storyDownloadName={`story-${downloadName}`}
                      cardPreview={cardPreview}
                      storyPreview={storyPreview}
                      downloadImageUrl={shareImageSummary ? shieldShareImagePath(shareImageSummary) : undefined}
                      downloadStoryUrl={shareImageSummary ? shieldShareImagePath(shareImageSummary, "story") : undefined}
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
