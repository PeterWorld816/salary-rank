// Dedicated "Save Image" template — 1200x630 (the standard link-preview
// ratio, matching lib/seo.ts's og:image size), rasterized by ShareButtons
// at 3x pixelRatio from this component's 400x210 CSS-pixel DOM. Landscape,
// so unlike the portrait UsShareCardStory this has room for the actual
// DistributionChart alongside the headline number — a dedicated component
// rather than a variant flag, so this layout is free to use that space
// however suits a wide card instead of squeezing a portrait design sideways.
import type { RefObject } from "react";
import { translations, formatTemplate, type LangCode } from "@/lib/i18n";
import { formatUsd as fmtUsd } from "@/lib/usFormat";
import { getTier } from "@/lib/tier";
import DistributionChart from "@/components/DistributionChart";
import { ShareTierBadge, siteHost } from "@/components/us/ShareCardBits";
import { pickFeaturedPercentiles, type NamedPercent } from "@/lib/shareCardCandidates";

export const WIDE_WIDTH = 400;
export const WIDE_HEIGHT = 210;

const ACCENT = "#34D399";
const HERO_ACCENT = "#FBBF24";
const GOLD_GLOW = "radial-gradient(circle, rgba(251,191,36,0.30) 0%, rgba(251,191,36,0.06) 45%, transparent 72%)";
const MINT_GLOW = "radial-gradient(circle, rgba(52,211,153,0.14) 0%, transparent 70%)";

export default function UsShareCardWide({
  stateName,
  locationName,
  countyPercentile,
  nationalPercentile,
  annualIncome,
  netWorthPercentile,
  ageBandLabel,
  ageIncomePercentile,
  ageNetWorthPercentile,
  cardRef,
  lang = "en",
}: {
  stateName: string;
  locationName: string;
  countyPercentile: number | null;
  nationalPercentile: number | null;
  annualIncome: number;
  netWorthPercentile: number | null;
  ageBandLabel: string;
  ageIncomePercentile: number | null;
  ageNetWorthPercentile: number | null;
  cardRef?: RefObject<HTMLDivElement>;
  lang?: LangCode;
}) {
  const t = translations[lang];

  const shortLabels: Record<string, string> = {
    county: t.usDashboardCountyIncomeLabel,
    national: t.usDashboardNationalIncomeLabel,
    ageIncome: formatTemplate(t.usDashboardAgeIncomeLabelTemplate, { age: ageBandLabel }),
    netWorth: t.usDashboardNetWorthLabel,
    ageNetWorth: formatTemplate(t.usDashboardAgeNetWorthLabelTemplate, { age: ageBandLabel }),
  };
  const candidates: NamedPercent[] = [
    countyPercentile != null && { key: "county", label: shortLabels.county, percent: countyPercentile },
    nationalPercentile != null && { key: "national", label: shortLabels.national, percent: nationalPercentile },
    ageIncomePercentile != null && { key: "ageIncome", label: shortLabels.ageIncome, percent: ageIncomePercentile },
    netWorthPercentile != null && { key: "netWorth", label: shortLabels.netWorth, percent: netWorthPercentile },
    ageNetWorthPercentile != null && { key: "ageNetWorth", label: shortLabels.ageNetWorth, percent: ageNetWorthPercentile },
  ].filter((c): c is NamedPercent => Boolean(c));
  const incomeBasis: NamedPercent | null =
    countyPercentile != null
      ? { key: "county", label: shortLabels.county, percent: countyPercentile }
      : nationalPercentile != null
        ? { key: "national", label: shortLabels.national, percent: nationalPercentile }
        : null;
  const { featured } = pickFeaturedPercentiles(candidates, incomeBasis);

  const featuredTier = featured ? getTier(featured.percent) : null;
  const isGold = featuredTier?.color === "gold";
  const host = siteHost();

  return (
    <div
      ref={cardRef}
      style={{
        width: `${WIDE_WIDTH}px`,
        height: `${WIDE_HEIGHT}px`,
        background: isGold
          ? "linear-gradient(120deg, #0A0805 0%, #14100A 55%, #08090A 100%)"
          : "linear-gradient(120deg, #08090A 0%, #101316 55%, #08090A 100%)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: "relative",
        overflow: "hidden",
        borderRadius: "16px",
        flexShrink: 0,
        border: isGold ? "1.5px solid rgba(251,191,36,0.35)" : "1.5px solid transparent",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "260px",
          height: "260px",
          top: "-60px",
          left: "-40px",
          background: isGold ? GOLD_GLOW : MINT_GLOW,
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, padding: "0 12px 0 26px", zIndex: 1 }}>
        <div style={{ display: "flex", color: "rgba(255,255,255,0.4)", fontSize: "11px", marginBottom: "6px" }}>
          {locationName}, {stateName}
        </div>

        {featured == null ? (
          <div style={{ display: "flex", color: "rgba(255,255,255,0.5)", fontSize: "14px", maxWidth: "220px" }}>{t.usCountyNoDataTitle}</div>
        ) : (
          <>
            {featuredTier && (
              <div style={{ display: "flex", marginBottom: "6px" }}>
                <ShareTierBadge tier={featuredTier} />
              </div>
            )}
            <div style={{ display: "flex", color: "rgba(255,255,255,0.55)", fontSize: "11px", marginBottom: "2px" }}>{featured.label}</div>
            <div
              style={{
                display: "flex",
                color: HERO_ACCENT,
                fontSize: "58px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                textShadow: isGold
                  ? "0 0 18px rgba(251,191,36,0.5), 0 0 40px rgba(251,191,36,0.25)"
                  : "0 0 20px rgba(251,191,36,0.16)",
              }}
            >
              {formatTemplate(t.topPercentTemplate, { percent: featured.percent })}
            </div>
          </>
        )}

        <div style={{ display: "flex", color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: 700, marginTop: "8px" }}>
          {fmtUsd(annualIncome)} / yr
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "auto", paddingTop: "10px" }}>
          <span style={{ display: "flex", width: "6px", height: "6px", borderRadius: "999px", background: ACCENT }} />
          <span style={{ display: "flex", color: "#FFFFFF", fontSize: "13px", fontWeight: 800, letterSpacing: "0.02em" }}>
            {host || t.usAppTitle}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingRight: "22px", zIndex: 1, flexShrink: 0 }}>
        <DistributionChart monthlySalary={annualIncome} width={130} lang={lang} dark min={15000} max={500000} averageValue={annualIncome} />
      </div>
    </div>
  );
}
