import type { RefObject } from "react";
import ResultCardVisual, { STORY_WIDTH, STORY_HEIGHT, type ReceiptRankRow } from "@/components/us/ResultCardVisual";

export { STORY_WIDTH, STORY_HEIGHT };

export default function UsShareCardStory({
  percent,
  rows,
  cardRef,
}: {
  percent: number | null;
  rows: ReceiptRankRow[];
  cardRef?: RefObject<HTMLDivElement>;
}) {
  return <ResultCardVisual variant="story" cardRef={cardRef} percent={percent} rows={rows} />;
}
