// The "Net worth card" option in the share modal (components/ShareButtons.tsx
// `alternate`) — only offered when the visitor entered a net worth. Same
// shield card as income (ShieldShareCard metric="netWorth"): Top N% + an
// age-band comparison + "Where do you rank?". The amount itself never goes on
// the card or into the og image URL — only the percentiles and age band.
import type { RefObject } from "react";
import ShieldShareCard from "@/components/us/ShieldShareCard";
import UsShareCardStory from "@/components/us/UsShareCardStory";
import { shieldNetWorthShareText, shieldShareImagePath } from "@/lib/shieldShare";
import type { UsInput } from "@/lib/usInput";

export function buildNetWorthShareAlternate({
  input,
  netWorthPercent,
  ageNetWorthPercent,
  ageLabel,
  location,
  cardRef,
  storyCardRef,
  labels,
  downloadName,
}: {
  input: UsInput;
  netWorthPercent: number | null;
  ageNetWorthPercent: number | null;
  ageLabel: string;
  location: string;
  cardRef: RefObject<HTMLDivElement>;
  storyCardRef: RefObject<HTMLDivElement>;
  labels: { income: string; netWorth: string };
  downloadName: string;
}) {
  if (input.netWorth == null || netWorthPercent == null) return undefined;
  const rows = [
    { label: "NATIONWIDE", percent: netWorthPercent },
    ...(ageNetWorthPercent != null ? [{ label: `AGE ${ageLabel.toUpperCase()}`, percent: ageNetWorthPercent }] : []),
  ];
  const summary = {
    percent: netWorthPercent,
    age: input.ageBand,
    agePercent: ageNetWorthPercent ?? undefined,
    metric: "netWorth" as const,
  };
  return {
    primaryLabel: labels.income,
    label: labels.netWorth,
    cardPreview: <ShieldShareCard variant="wide" metric="netWorth" cardRef={cardRef} percent={netWorthPercent} rows={rows} location={location} />,
    storyPreview: <UsShareCardStory metric="netWorth" cardRef={storyCardRef} percent={netWorthPercent} rows={rows} location={location} />,
    downloadImageUrl: shieldShareImagePath(summary),
    downloadStoryUrl: shieldShareImagePath(summary, "story"),
    shareText: shieldNetWorthShareText(netWorthPercent),
    downloadName: `net-worth-${downloadName}`,
  };
}
