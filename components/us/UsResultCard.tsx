import type { RefObject } from "react";
import { translations, formatTemplate, type LangCode } from "@/lib/i18n";
import { formatUsd as fmtUsd } from "@/lib/usFormat";
import { getTier, type Tier } from "@/lib/tier";
import DistributionChart from "@/components/DistributionChart";

// "Classic" card — square-ish portrait, good for Twitter/KakaoTalk/link
// attachments and as the default on-page preview.
export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 780;

// Instagram/Snapchat Story ratio, exactly 9:16 — at the same 3x pixelRatio
// ShareButtons exports with, this rasterizes to precisely 1080x1920.
export const STORY_WIDTH = 360;
export const STORY_HEIGHT = 640;

const ACCENT = "#34D399";
// Gold, not mint — keeps the hero percent visually distinct from the map.
const HERO_ACCENT = "#FBBF24";
const GOLD_GLOW = "radial-gradient(circle, rgba(251,191,36,0.30) 0%, rgba(251,191,36,0.06) 45%, transparent 72%)";
const MINT_GLOW = "radial-gradient(circle, rgba(52,211,153,0.14) 0%, transparent 70%)";

// process.env.NEXT_PUBLIC_SITE_URL is inlined at build time (Next replaces
// this exact expression), so reading it here — even in a client bundle — is
// safe and needs no extra plumbing through props.
function siteHost(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return "";
  return raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

// Inline styles only (no Tailwind) — matches every other element in this
// card, which html-to-image rasterizes straight from computed styles.
function TierBadge({ tier, big }: { tier: Tier; big?: boolean }) {
  const color = tier.color === "gold" ? HERO_ACCENT : ACCENT;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        borderRadius: "999px",
        border: `1px solid ${color}66`,
        background: `${color}26`,
        color,
        fontSize: big ? "13px" : "11px",
        fontWeight: 800,
        padding: big ? "4px 12px" : "3px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {tier.emoji} {tier.label}
    </span>
  );
}

function MiniRow({ label, sub, value }: { label: string; sub?: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ display: "flex", fontSize: "11px", color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>{label}</span>
        {sub && <span style={{ display: "flex", fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>{sub}</span>}
      </div>
      <span style={{ display: "flex", fontSize: "12px", fontWeight: 800, color: ACCENT }}>{value}</span>
    </div>
  );
}

type NamedPercent = { key: string; label: string; percent: number };

export default function UsResultCard({
  stateName,
  locationName,
  countyPercentile,
  nationalPercentile,
  annualIncome,
  netWorthPercentile,
  k401Balance,
  k401VsMedianPercent,
  ageBandLabel,
  ageIncomePercentile,
  ageNetWorthPercentile,
  cardRef,
  lang = "en",
  variant = "card",
}: {
  stateName: string;
  locationName: string;
  countyPercentile: number | null;
  nationalPercentile: number | null;
  annualIncome: number;
  netWorthPercentile: number | null;
  k401Balance: number | null;
  k401VsMedianPercent: number | null;
  ageBandLabel: string;
  ageIncomePercentile: number | null;
  ageNetWorthPercentile: number | null;
  cardRef?: RefObject<HTMLDivElement>;
  lang?: LangCode;
  variant?: "card" | "story";
}) {
  const t = translations[lang];
  const isStory = variant === "story";
  const width = isStory ? STORY_WIDTH : CARD_WIDTH;
  const height = isStory ? STORY_HEIGHT : CARD_HEIGHT;

  // ── Pick the 1-2 most impressive percentiles to feature big, instead of
  // dumping every number in at the same size (see PersonalizedResult's
  // headline, which uses the same "best rank wins" idea for its narrative). ──
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
  const sorted = [...candidates].sort((a, b) => a.percent - b.percent);
  const featured = sorted[0] ?? null;
  const incomeBasis: NamedPercent | null =
    countyPercentile != null
      ? { key: "county", label: shortLabels.county, percent: countyPercentile }
      : nationalPercentile != null
        ? { key: "national", label: shortLabels.national, percent: nationalPercentile }
        : null;
  let secondary: NamedPercent | null = null;
  if (featured) {
    if (incomeBasis && incomeBasis.key !== featured.key && featured.percent <= incomeBasis.percent - 10) {
      secondary = incomeBasis;
    } else {
      secondary = sorted.find((c) => c.key !== featured.key) ?? null;
    }
  }
  const rest = candidates.filter((c) => c.key !== featured?.key && c.key !== secondary?.key);

  const featuredTier = featured ? getTier(featured.percent) : null;
  const isGold = featuredTier?.color === "gold";
  const host = siteHost();

  return (
    <div
      ref={cardRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: isGold
          ? "linear-gradient(160deg, #0A0805 0%, #14100A 55%, #08090A 100%)"
          : "linear-gradient(160deg, #08090A 0%, #101316 55%, #08090A 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: isStory ? "center" : "center",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: "relative",
        overflow: "hidden",
        borderRadius: "24px",
        flexShrink: 0,
        border: isGold ? "1.5px solid rgba(251,191,36,0.35)" : "1.5px solid transparent",
        boxShadow: isGold ? "0 0 60px rgba(251,191,36,0.12)" : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: isGold ? "380px" : "300px",
          height: isGold ? "380px" : "300px",
          top: "30px",
          left: "20px",
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
            bottom: "20px",
            right: "-40px",
            background: GOLD_GLOW,
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
      )}

      <div style={{ display: "flex", color: "rgba(255,255,255,0.4)", fontSize: "12px", marginBottom: "8px" }}>
        {locationName}, {stateName}
      </div>

      {featured == null ? (
        <div style={{ display: "flex", color: "rgba(255,255,255,0.5)", fontSize: "16px", marginBottom: "16px", textAlign: "center", maxWidth: "260px" }}>
          {t.usCountyNoDataTitle}
        </div>
      ) : (
        <>
          {featuredTier && (
            <div style={{ display: "flex", marginBottom: "8px" }}>
              <TierBadge tier={featuredTier} big />
            </div>
          )}
          <div style={{ display: "flex", color: "rgba(255,255,255,0.6)", fontSize: "14px", marginBottom: "2px" }}>
            {featured.label}
          </div>
          <div
            style={{
              display: "flex",
              color: HERO_ACCENT,
              fontSize: isStory ? "76px" : "58px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginBottom: secondary ? "14px" : "18px",
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
                padding: "6px 16px",
                marginBottom: "18px",
              }}
            >
              <span style={{ display: "flex", fontSize: "11px", color: "rgba(255,255,255,0.55)" }}>{secondary.label}</span>
              <span style={{ display: "flex", fontSize: "15px", fontWeight: 800, color: ACCENT }}>
                {formatTemplate(t.topPercentTemplate, { percent: secondary.percent })}
              </span>
            </div>
          )}
        </>
      )}

      <div style={{ display: "flex", color: "rgba(255,255,255,0.75)", fontSize: "14px", marginBottom: isStory ? "10px" : "18px", textAlign: "center" }}>
        {fmtUsd(annualIncome)} / yr
      </div>

      {!isStory && (
        <div style={{ display: "flex", marginBottom: "16px" }}>
          <DistributionChart monthlySalary={annualIncome} width={240} lang={lang} dark min={15000} max={500000} averageValue={annualIncome} />
        </div>
      )}

      {!isStory && rest.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "280px", marginBottom: "8px" }}>
          {rest.map((c) => (
            <MiniRow key={c.key} label={c.label} value={formatTemplate(t.topPercentTemplate, { percent: c.percent })} />
          ))}
          {k401VsMedianPercent != null && (
            <MiniRow
              label={t.usK401SectionTitle}
              sub={k401Balance != null ? fmtUsd(k401Balance) : undefined}
              value={formatTemplate(t.usK401VsMedianTemplate, { percent: k401VsMedianPercent })}
            />
          )}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: isStory ? "16px 20px" : "10px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {/* The actual viral loop: whoever sees this image (a screenshot in a
            group chat, an IG story with no live link) needs to be able to
            read where to go next without tapping anything — so the domain
            gets full-contrast, bold text, not a faint footnote. */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "flex", width: "6px", height: "6px", borderRadius: "999px", background: ACCENT }} />
          <span style={{ display: "flex", color: "#FFFFFF", fontSize: isStory ? "16px" : "14px", fontWeight: 800, letterSpacing: "0.02em" }}>
            {host || t.usAppTitle}
          </span>
        </div>
        <span style={{ display: "flex", color: "rgba(255,255,255,0.3)", fontSize: "10px", textAlign: "center" }}>
          {t.usShareCardSource}
        </span>
      </div>
    </div>
  );
}
