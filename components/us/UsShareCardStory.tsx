import type { RefObject } from "react";
import ShieldShareCard, { STORY_WIDTH, STORY_HEIGHT, type ShieldRankRow } from "@/components/us/ShieldShareCard";

export { STORY_WIDTH, STORY_HEIGHT };

export default function UsShareCardStory({
  percent,
  rows,
  cardRef,
  location,
  noDataMessage,
  metric,
}: {
  percent: number | null;
  rows: ShieldRankRow[];
  cardRef?: RefObject<HTMLDivElement>;
  location?: string;
  noDataMessage?: string;
  metric?: "income" | "netWorth";
}) {
  return (
    <ShieldShareCard
      variant="story"
      cardRef={cardRef}
      percent={percent}
      rows={rows}
      location={location}
      noDataMessage={noDataMessage}
      metric={metric}
    />
  );
}
