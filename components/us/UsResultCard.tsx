import type { RefObject } from "react";
import { translations, formatTemplate, type LangCode } from "@/lib/i18n";
import { formatUsd as fmtUsd } from "@/lib/usFormat";
import DistributionChart from "@/components/DistributionChart";

export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 780;

const ACCENT = "#34D399";
// Gold, not mint — keeps the hero percent visually distinct from the map.
const HERO_ACCENT = "#FBBF24";

function Row({ label, sub, value }: { label: string; sub: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ display: "flex", fontSize: "12px", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{label}</span>
        <span style={{ display: "flex", fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{sub}</span>
      </div>
      <span style={{ display: "flex", fontSize: "14px", fontWeight: 800, color: ACCENT }}>{value}</span>
    </div>
  );
}

export default function UsResultCard({
  stateName,
  countyName,
  countyPercentile,
  nationalPercentile,
  annualIncome,
  netWorthPercentile,
  netWorth,
  k401VsMedianPercent,
  ageBandLabel,
  ageIncomePercentile,
  ageNetWorthPercentile,
  cardRef,
  lang = "en",
}: {
  stateName: string;
  countyName: string;
  countyPercentile: number | null;
  nationalPercentile: number | null;
  annualIncome: number;
  netWorthPercentile: number;
  netWorth: number;
  k401VsMedianPercent: number;
  ageBandLabel: string;
  ageIncomePercentile: number | null;
  ageNetWorthPercentile: number | null;
  cardRef?: RefObject<HTMLDivElement>;
  lang?: LangCode;
}) {
  const t = translations[lang];
  const heroPercent = countyPercentile ?? nationalPercentile;
  const heroLabel = countyPercentile != null ? t.usCountyPercentileHeroLabel : t.usNationalPercentileHeroLabel;

  return (
    <div
      ref={cardRef}
      style={{
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        background: "linear-gradient(160deg, #08090A 0%, #101316 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: "relative",
        overflow: "hidden",
        borderRadius: "24px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          top: "40px",
          left: "30px",
          background: "radial-gradient(circle, rgba(52,211,153,0.14) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", color: "rgba(255,255,255,0.4)", fontSize: "12px", marginBottom: "8px" }}>
        {countyName}, {stateName}
      </div>

      {heroPercent != null ? (
        <>
          <div style={{ display: "flex", color: "rgba(255,255,255,0.6)", fontSize: "14px", marginBottom: "2px" }}>
            {heroLabel}
          </div>
          <div
            style={{
              display: "flex",
              color: HERO_ACCENT,
              fontSize: "52px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginBottom: "10px",
            }}
          >
            {heroPercent}%
          </div>
        </>
      ) : (
        <div style={{ display: "flex", color: "rgba(255,255,255,0.5)", fontSize: "16px", marginBottom: "16px", textAlign: "center", maxWidth: "260px" }}>
          {t.usCountyNoDataTitle}
        </div>
      )}

      <div style={{ display: "flex", color: "rgba(255,255,255,0.75)", fontSize: "14px", marginBottom: "18px", textAlign: "center" }}>
        {fmtUsd(annualIncome)} / yr
      </div>

      <div style={{ display: "flex", marginBottom: "16px" }}>
        <DistributionChart monthlySalary={annualIncome} width={240} lang={lang} dark min={15000} max={500000} averageValue={annualIncome} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "280px", marginBottom: "8px" }}>
        {nationalPercentile != null && (
          <Row label={t.usNationalPercentileHeroLabel} sub="" value={formatTemplate(t.topPercentTemplate, { percent: nationalPercentile })} />
        )}
        {ageIncomePercentile != null && (
          <Row
            label={formatTemplate(t.usAgeIncomePercentileHeroLabel, { age: ageBandLabel })}
            sub=""
            value={formatTemplate(t.topPercentTemplate, { percent: ageIncomePercentile })}
          />
        )}
        <Row label={t.usNetWorthSectionTitle} sub={t.usNetWorthNationalBadge} value={formatTemplate(t.topPercentTemplate, { percent: netWorthPercentile })} />
        {ageNetWorthPercentile != null && (
          <Row
            label={formatTemplate(t.usAgeNetWorthPercentileHeroLabel, { age: ageBandLabel })}
            sub=""
            value={formatTemplate(t.topPercentTemplate, { percent: ageNetWorthPercentile })}
          />
        )}
        <Row label={t.usK401SectionTitle} sub={fmtUsd(netWorth)} value={formatTemplate(t.usK401VsMedianTemplate, { percent: k401VsMedianPercent })} />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
        }}
      >
        {/* Condensed one-liner (no table codes/date range) — the full source
            list stays on the page body, this is just for when the image is
            shared standalone and has no surrounding page context. */}
        <span style={{ display: "flex", color: "rgba(255,255,255,0.3)", fontSize: "10px", textAlign: "center" }}>
          {t.usShareCardSource}
        </span>
        <span style={{ display: "flex", color: "rgba(255,255,255,0.18)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em" }}>
          {t.usAppTitle}
        </span>
      </div>
    </div>
  );
}
