"use client";
// Coaching-insight card for the state/county (and nationwide) drill-down
// steps — same content CoachingInsightCard.tsx has always rendered for the
// "full"/"standalone" dashboard, now also shown on /us, /us/[state], and
// /us/[state]/[county], placed after the map/next-step section rather than
// competing with it at the top of the page. Shares its numbers with
// CompactResultCard.tsx via useCompactResult.ts. Renders nothing while no
// result is available (mirrors NoDataCard's threshold in that hook, and
// avoids showing coaching copy with no percentile behind it).
import { Suspense } from "react";
import { useLanguage } from "@/lib/LanguageProvider";
import CoachingInsightCard from "@/components/us/result/CoachingInsightCard";
import type { StateMeta } from "@/data/us/stateMeta";
import type { UsCountyIncome } from "@/lib/usIncomeCalc";
import { useCompactResult } from "@/components/us/result/useCompactResult";

function CompactInsightSectionInner({
  presetState,
  presetCounty,
}: {
  presetState: StateMeta | null;
  presetCounty: UsCountyIncome | null;
}) {
  const { t } = useLanguage();
  const result = useCompactResult(presetState, presetCounty);
  if (!result.ready) return null;
  return <CoachingInsightCard insight={result.coachingInsight} title={t.usCoachingInsightTitle} gapNote={result.gapNote} />;
}

export default function CompactInsightSection(props: { presetState: StateMeta | null; presetCounty: UsCountyIncome | null }) {
  return (
    <Suspense fallback={null}>
      <CompactInsightSectionInner {...props} />
    </Suspense>
  );
}
