import type { CSSProperties, RefObject } from "react";
import { getReceiptGrade, receiptRankFromPercent } from "@/lib/receiptCard";
import { getTier } from "@/lib/tier";
import { siteHost, tierAccent, tierCardBackground, tierGlow } from "@/components/us/ShareCardBits";

export const WIDE_WIDTH = 360;
export const WIDE_HEIGHT = 450;
export const STORY_WIDTH = 360;
export const STORY_HEIGHT = 640;
export const SHARE_IMAGE_WIDTH = WIDE_WIDTH * 3;
export const SHARE_IMAGE_HEIGHT = WIDE_HEIGHT * 3;
export const STORY_IMAGE_WIDTH = STORY_WIDTH * 3;
export const STORY_IMAGE_HEIGHT = STORY_HEIGHT * 3;

export type ShieldRankRow = {
  label: string;
  percent: number;
};

type ShieldShareCardProps = {
  variant: "wide" | "story";
  cardRef?: RefObject<HTMLDivElement>;
  percent: number | null;
  rows: ShieldRankRow[];
  location?: string;
  noDataMessage?: string;
  renderScale?: number;
  // "netWorth" swaps only the wording (eyebrow, shield label) — same shield,
  // colors, layout and "Where do you rank?" close as the income card. Never
  // carries a dollar amount, just like the income card.
  metric?: "income" | "netWorth";
};

function unit(value: number, renderScale: number): string | number {
  return renderScale > 1 ? `${value * renderScale}px` : `calc(100cqw / ${WIDE_WIDTH} * ${value})`;
}

function formatRankLabel(label: string): string {
  if (/^AGE\s+/i.test(label)) return `among ages ${label.replace(/^AGE\s+/i, "").replace(/–/g, "-")}`;
  if (/^IN\s+/i.test(label)) {
    const place = label.replace(/^IN\s+/i, "").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
    return `in ${place}`;
  }
  return label.toLowerCase();
}

function ShieldIcon({ grade, size, renderScale, metricWord }: { grade: string; size: string | number; renderScale: number; metricWord: string }) {
  return (
    <div aria-label={`${grade} ${metricWord} grade`} role="img" style={{ position: "relative", display: "flex", width: size, height: size, flexShrink: 0 }}>
      <svg width="100%" height="100%" viewBox="0 0 160 190" style={{ position: "absolute", inset: 0, display: "flex", width: "100%", height: "100%" }}>
        <path
          d="M80 4 153 31v58c0 43-28 75-73 97C35 164 7 132 7 89V31L80 4Z"
          fill="#F0CB61"
          stroke="#FFF0B3"
          strokeWidth="5"
        />
        <path
          d="M80 16 141 39v50c0 35-22 62-61 82-39-20-61-47-61-82V39l61-23Z"
          fill="#D9A92E"
          stroke="#F8DE8B"
          strokeWidth="2"
        />
      </svg>
      <span
        style={{
          position: "absolute",
          top: grade.length > 1 ? "43%" : "38.5%",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          color: "#5B3B0A",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: unit(grade.length > 1 ? 40 : 52, renderScale),
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {grade}
      </span>
    </div>
  );
}

export default function ShieldShareCard({
  variant,
  cardRef,
  percent,
  rows,
  location,
  noDataMessage,
  renderScale = 1,
  metric = "income",
}: ShieldShareCardProps) {
  const isNetWorth = metric === "netWorth";
  const isStory = variant === "story";
  const height = isStory ? STORY_HEIGHT : WIDE_HEIGHT;
  const tier = percent == null ? null : getTier(percent);
  const grade = percent == null ? null : getReceiptGrade(receiptRankFromPercent(percent)).label;
  const accent = tier ? tierAccent(tier) : "#34D399";
  const comparisonRows = rows.filter((row) => !/^NATIONWIDE$/i.test(row.label)).slice(0, 2);
  const host = siteHost();
  const responsive = renderScale === 1;
  const scaledStyle: CSSProperties = responsive
    ? { containerType: "inline-size" }
    : {};

  return (
    <div
      ref={cardRef}
      data-shield-share-card="true"
      style={{
        ...scaledStyle,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: responsive ? "100%" : WIDE_WIDTH * renderScale,
        height: responsive ? undefined : height * renderScale,
        aspectRatio: `${WIDE_WIDTH} / ${height}`,
        overflow: "hidden",
        borderRadius: unit(isStory ? 0 : 20, renderScale),
        boxSizing: "border-box",
        background: tier ? tierCardBackground(tier) : "linear-gradient(160deg, #0B2A22 0%, #0F3A2E 55%, #071D17 100%)",
        color: "#FFFFFF",
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "100%",
          height: unit(isStory ? 360 : 380, renderScale),
          top: unit(isStory ? 115 : 18, renderScale),
          left: 0,
          borderRadius: "50%",
          background: tier ? tierGlow(tier) : "radial-gradient(circle, rgba(52,211,153,0.20) 0%, rgba(52,211,153,0.05) 45%, transparent 72%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          padding: isStory
            ? `${unit(84, renderScale)} ${unit(14, renderScale)}`
            : `${unit(10, renderScale)} ${unit(14, renderScale)} ${unit(12, renderScale)}`,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: unit(8, renderScale),
            minHeight: unit(24, renderScale),
          }}
        >
          <span
            style={{
              display: "flex",
              maxWidth: "70%",
              overflow: "hidden",
              borderRadius: unit(999, renderScale),
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.10)",
              padding: `${unit(5, renderScale)} ${unit(10, renderScale)}`,
              color: "rgba(255,255,255,0.94)",
              fontSize: unit(11, renderScale),
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {location || "United States"}
          </span>
          <span
            style={{
              display: "flex",
              color: "rgba(255,255,255,0.52)",
              fontSize: unit(9, renderScale),
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {host}
          </span>
        </div>

        {percent == null || tier == null || grade == null ? (
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.75)",
              fontSize: unit(16, renderScale),
              textAlign: "center",
            }}
          >
            {noDataMessage}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: unit(isStory ? 4 : 2, renderScale),
            }}
          >
            <ShieldIcon grade={grade} size={unit(isStory ? 116 : 124, renderScale)} renderScale={renderScale} metricWord={isNetWorth ? "net worth" : "income"} />
            <span
              style={{
                display: "flex",
                color: "#B9F5DE",
                fontSize: unit(16, renderScale),
                fontWeight: 900,
                letterSpacing: unit(4, renderScale),
                lineHeight: 1,
              }}
            >
              {isNetWorth ? "NET WORTH · TOP" : "TOP"}
            </span>
            <span
              style={{
                display: "flex",
                color: accent,
                fontSize: unit(84, renderScale),
                fontWeight: 900,
                letterSpacing: unit(-3, renderScale),
                lineHeight: 0.98,
                whiteSpace: "nowrap",
              }}
            >
              {Math.round(percent)}%
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                color: "#FFFFFF",
                fontSize: unit(14, renderScale),
                fontWeight: 800,
                lineHeight: 1.16,
                textAlign: "center",
              }}
            >
              <span>{tier.label}</span>
              <span>Not a billionaire, not broke.</span>
              <span>Main character in the making.</span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: unit(8, renderScale) }}>
          {comparisonRows.length > 0 && (
            <div style={{ display: "flex", gap: unit(8, renderScale), width: "100%" }}>
              {comparisonRows.map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    flex: 1,
                    minWidth: 0,
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: unit(2, renderScale),
                    borderRadius: unit(10, renderScale),
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.22)",
                    padding: `${unit(8, renderScale)} ${unit(9, renderScale)}`,
                  }}
                >
                  <strong style={{ display: "flex", color: accent, fontSize: unit(16, renderScale), fontWeight: 900, lineHeight: 1.05, whiteSpace: "nowrap" }}>
                    Top {Math.round(row.percent)}%
                  </strong>
                  <span style={{ display: "flex", overflow: "hidden", color: "rgba(255,255,255,0.68)", fontSize: unit(10, renderScale), fontWeight: 700, lineHeight: 1.1, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {formatRankLabel(row.label)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <span
            style={{
              display: "flex",
              justifyContent: "center",
              color: "#D8F4E9",
              fontSize: unit(12, renderScale),
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            Where do you rank?
          </span>
        </div>
      </div>
    </div>
  );
}
