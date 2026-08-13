// Dedicated "Save Story" template — 1080x1920 (9:16, Instagram/Snapchat/
// KakaoTalk Story), rasterized by ShareButtons at 3x pixelRatio from this
// component's 360x640 CSS-pixel DOM. Deliberately its own component (not a
// variant flag on a shared card) so this layout can stay tuned for a
// full-bleed vertical story — text and the tier/percentile centered and
// large, no chart or mini stat rows, unlike UsShareCardWide's landscape
// layout.
import type { RefObject } from "react";
import { translations, formatTemplate, type LangCode } from "@/lib/i18n";
import { formatUsd as fmtUsd } from "@/lib/usFormat";
import { getTier } from "@/lib/tier";
import { ShareTierBadge, siteHost } from "@/components/us/ShareCardBits";
import { pickFeaturedPercentiles, type NamedPercent } from "@/lib/shareCardCandidates";

export const STORY_WIDTH = 360;
export const STORY_HEIGHT = 640;

const ACCENT = "#34D399";
const HERO_ACCENT = "#FBBF24";
const GOLD_GLOW = "radial-gradient(circle, rgba(251,191,36,0.30) 0%, rgba(251,191,36,0.06) 45%, transparent 72%)";
const MINT_GLOW = "radial-gradient(circle, rgba(52,211,153,0.14) 0%, transparent 70%)";

export default function UsShareCardStory({
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
  const { featured, secondary } = pickFeaturedPercentiles(candidates, incomeBasis);

  const featuredTier = featured ? getTier(featured.percent) : null;
  const isGold = featuredTier?.color === "gold";
  const host = siteHost();

  return (
    <div
      ref={cardRef}
      style={{
        width: `${STORY_WIDTH}px`,
        height: `${STORY_HEIGHT}px`,
        background: isGold
          ? "linear-gradient(160deg, #0A0805 0%, #14100A 55%, #08090A 100%)"
          : "linear-gradient(160deg, #08090A 0%, #101316 55%, #08090A 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: isGold ? "380px" : "300px",
          height: isGold ? "380px" : "300px",
          top: "40px",
          left: "-40px",
          background: isGold ? GOLD_GLOW : MINT_GLOW,
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      {isGold && (
        <div
          style={{
            position: "absolute",
            width: "260px",
            height: "260px",
            bottom: "80px",
            right: "-60px",
            background: GOLD_GLOW,
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
      )}

      <div style={{ display: "flex", color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "10px" }}>
        {locationName}, {stateName}
      </div>

      {featured == null ? (
        <div style={{ display: "flex", color: "rgba(255,255,255,0.5)", fontSize: "18px", marginBottom: "16px", textAlign: "center", maxWidth: "280px" }}>
          {t.usCountyNoDataTitle}
        </div>
      ) : (
        <>
          {featuredTier && (
            <div style={{ display: "flex", marginBottom: "10px" }}>
              <ShareTierBadge tier={featuredTier} big />
            </div>
          )}
          <div style={{ display: "flex", color: "rgba(255,255,255,0.6)", fontSize: "15px", marginBottom: "4px" }}>{featured.label}</div>
          <div
            style={{
              display: "flex",
              color: HERO_ACCENT,
              fontSize: "76px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginBottom: secondary ? "16px" : "20px",
              textShadow: isGold
                ? "0 0 18px rgba(251,191,36,0.55), 0 0 46px rgba(251,191,36,0.3)"
                : "0 0 24px rgba(251,191,36,0.18)",
            }}
          >
            {formatTemplate(t.topPercentTemplate, { percent: featured.percent })}
          </div>

          {secondary && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                padding: "7px 18px",
                marginBottom: "20px",
              }}
            >
              <span style={{ display: "flex", fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>{secondary.label}</span>
              <span style={{ display: "flex", fontSize: "16px", fontWeight: 800, color: ACCENT }}>
                {formatTemplate(t.topPercentTemplate, { percent: secondary.percent })}
              </span>
            </div>
          )}
        </>
      )}

      <div style={{ display: "flex", color: "rgba(255,255,255,0.75)", fontSize: "16px", textAlign: "center" }}>{fmtUsd(annualIncome)} / yr</div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "5px",
        }}
      >
        {/* Same reasoning as the wide card's footer: a screenshot in a
            group chat or a Story with no live link needs to be readable
            without tapping anything. */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "flex", width: "6px", height: "6px", borderRadius: "999px", background: ACCENT }} />
          <span style={{ display: "flex", color: "#FFFFFF", fontSize: "17px", fontWeight: 800, letterSpacing: "0.02em" }}>
            {host || t.usAppTitle}
          </span>
        </div>
        <span style={{ display: "flex", color: "rgba(255,255,255,0.3)", fontSize: "11px", textAlign: "center" }}>{t.usShareCardSource}</span>
      </div>
    </div>
  );
}
