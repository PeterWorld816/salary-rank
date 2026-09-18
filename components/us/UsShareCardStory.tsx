// "Save Story" wrapper (9:16, Instagram/Snapchat/KakaoTalk Story) — a thin
// portrait shell around ResultCardVisual (see that file's own header comment)
// so the story card and the on-screen/Save-Image card share every number,
// dot, and stat element and only differ in layout. Deliberately takes the
// *already-resolved* headline values as props rather than recomputing its
// own "which percentile wins" logic — the caller (PersonalizedResult.tsx /
// CompactResultCard.tsx) already picked the featured metric for its own
// on-screen card, so passing that same result straight through is what
// guarantees this can never diverge from what's on screen, rather than two
// independent selections that happen to agree.
import type { RefObject } from "react";
import type { Tier } from "@/lib/tier";
import ResultCardVisual, { STORY_WIDTH, STORY_HEIGHT } from "@/components/us/ResultCardVisual";
import { siteHost } from "@/components/us/ShareCardBits";

export { STORY_WIDTH, STORY_HEIGHT };

export default function UsShareCardStory({
  tier,
  percent,
  percentTemplate,
  subLabel,
  locationLine,
  watermarkFallback,
  incomeLabel,
  incomeValue,
  gapLabel,
  gapNote,
  beatText,
  secondaryLabel,
  secondaryValueText,
  sourceText,
  noDataMessage,
  cardRef,
}: {
  tier: Tier | null;
  percent: number | null;
  percentTemplate: string;
  subLabel?: string | null;
  locationLine?: string | null;
  watermarkFallback: string;
  incomeLabel: string;
  incomeValue: string;
  gapLabel: string;
  gapNote?: string | null;
  beatText: string;
  secondaryLabel?: string | null;
  secondaryValueText?: string | null;
  sourceText?: string | null;
  noDataMessage?: string;
  cardRef?: RefObject<HTMLDivElement>;
}) {
  return (
    <ResultCardVisual
      variant="story"
      cardRef={cardRef}
      tier={tier}
      percent={percent}
      percentTemplate={percentTemplate}
      subLabel={subLabel}
      locationLine={locationLine}
      host={siteHost()}
      watermarkFallback={watermarkFallback}
      incomeLabel={incomeLabel}
      incomeValue={incomeValue}
      gapLabel={gapLabel}
      gapNote={gapNote}
      beatText={beatText}
      secondaryLabel={secondaryLabel}
      secondaryValueText={secondaryValueText}
      sourceText={sourceText}
      noDataMessage={noDataMessage}
      play={false}
    />
  );
}
