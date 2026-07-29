import type { RefObject } from "react";
import type { SalaryInput, SalaryRankResult } from "@/lib/salaryCalc";
import { getAgeGroup, getIndustry, getRegion, overallAverage } from "@/lib/salaryCalc";
import type { NetWorthRankResult } from "@/lib/netWorthCalc";
import { pick, translations, formatTemplate, formatManwon, type LangCode, type Translations } from "@/lib/i18n";
import DistributionChart from "@/components/DistributionChart";

export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 780;

const ACCENT = "#34D399";

function ComparisonRow({ label, sub, percent, t }: { label: string; sub: string; percent: number; t: Translations }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ display: "flex", fontSize: "12px", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{label}</span>
        <span style={{ display: "flex", fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{sub}</span>
      </div>
      <span style={{ display: "flex", fontSize: "14px", fontWeight: 800, color: ACCENT }}>
        {formatTemplate(t.topPercentTemplate, { percent })}
      </span>
    </div>
  );
}

export default function ResultCard({
  input, rankResult, netWorthResult, cardRef, lang = "ko",
}: {
  input: SalaryInput;
  rankResult: SalaryRankResult;
  netWorthResult?: NetWorthRankResult | null;
  cardRef?: RefObject<HTMLDivElement>;
  lang?: LangCode;
}) {
  const t = translations[lang];
  const ageLabel = pick(getAgeGroup(input.ageGroup).label, lang);
  const industryLabel = pick(getIndustry(input.industry).label, lang);
  const regionLabel = pick(getRegion(input.region).label, lang);

  return (
    <div
      ref={cardRef}
      style={{
        width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px`,
        background: "linear-gradient(160deg, #0D0D0D 0%, #131313 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: "relative", overflow: "hidden", borderRadius: "24px",
        flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", width: "300px", height: "300px",
        top: "40px", left: "30px",
        background: "radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      <div style={{ display: "flex", color: "rgba(255,255,255,0.4)", fontSize: "12px", marginBottom: "8px" }}>
        {t.resultCardLabel}
      </div>

      <div style={{ display: "flex", color: "rgba(255,255,255,0.6)", fontSize: "14px", marginBottom: "2px" }}>
        {t.percentileHeroLabel}
      </div>
      <div style={{
        display: "flex", color: ACCENT, fontSize: "52px", fontWeight: 900,
        letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "10px",
      }}>
        {rankResult.percentileRounded}%
      </div>

      <div style={{ display: "flex", color: "rgba(255,255,255,0.75)", fontSize: "14px", marginBottom: "18px", textAlign: "center" }}>
        {formatTemplate(t.annualEstimateTemplate, { value: formatManwon(rankResult.annual, lang) })}
      </div>

      <div style={{ display: "flex", marginBottom: "16px" }}>
        <DistributionChart monthlySalary={rankResult.monthly} width={240} lang={lang} dark averageValue={overallAverage} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "280px", marginBottom: "8px" }}>
        <ComparisonRow t={t} label={t.comparisonAge} sub={ageLabel} percent={rankResult.groupComparisons.ageGroup} />
        <ComparisonRow t={t} label={t.comparisonIndustry} sub={industryLabel} percent={rankResult.groupComparisons.industry} />
        <ComparisonRow t={t} label={t.comparisonRegion} sub={regionLabel} percent={rankResult.groupComparisons.region} />
      </div>

      {netWorthResult && (
        <>
          <div style={{
            display: "flex", width: "280px", height: "1px",
            background: "rgba(255,255,255,0.08)", margin: "14px 0",
          }} />
          <div style={{ display: "flex", color: "rgba(255,255,255,0.6)", fontSize: "13px", marginBottom: "2px" }}>
            {t.netWorthHeroLabel}
          </div>
          <div style={{
            display: "flex", color: ACCENT, fontSize: "34px", fontWeight: 900,
            letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "6px",
          }}>
            {netWorthResult.percentileRounded}%
          </div>
          <div style={{ display: "flex", color: "rgba(255,255,255,0.6)", fontSize: "12px", marginBottom: "4px" }}>
            {formatTemplate(t.netWorthValueTemplate, { value: formatManwon(netWorthResult.netWorth, lang) })}
          </div>
        </>
      )}

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "10px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
      }}>
        <span style={{ display: "flex", color: "rgba(255,255,255,0.3)", fontSize: "10px", textAlign: "center" }}>
          {t.sourceLabel}: {t.sourceText}
        </span>
        <span style={{ display: "flex", color: "rgba(255,255,255,0.18)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em" }}>
          {t.appTitle}
        </span>
      </div>
    </div>
  );
}
