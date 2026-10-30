// Share card for /us/where-to-live — same design language as the shield card
// (components/us/ShieldShareCard.tsx: green card gradient, glow, location
// pill + host on top, one big number, "Where do you…?" close) at the same
// 4:5 and 9:16 sizes. Carries a percent, one metro name and a grade — never
// the visitor's income. Plain inline styles with display:flex everywhere so
// the same component renders in the modal and in next/og's ImageResponse
// (app/[locale]/where-to-live/og/route.tsx, renderScale 3).
import type { CSSProperties, RefObject } from "react";
import { STORY_HEIGHT, WIDE_HEIGHT, WIDE_WIDTH } from "@/components/us/ShieldShareCard";
import { siteHost } from "@/components/us/ShareCardBits";
import { GRADE_LABELS } from "@/lib/livabilityGrades";
import type { GradeId } from "@/lib/livability";

export default function LivabilityShareCard({
  variant,
  cardRef,
  percent,
  bestName,
  bestGrade,
  renderScale = 1,
  host,
}: {
  variant: "wide" | "story";
  cardRef?: RefObject<HTMLDivElement>;
  // null = the page's generic preview (no result yet): shows the question.
  percent: number | null;
  bestName: string | null;
  bestGrade: GradeId | null;
  renderScale?: number;
  host?: string;
}) {
  const isStory = variant === "story";
  const height = isStory ? STORY_HEIGHT : WIDE_HEIGHT;
  const responsive = renderScale === 1;
  const u = (v: number): string => (responsive ? `calc(100cqw / ${WIDE_WIDTH} * ${v})` : `${v * renderScale}px`);
  const grade = bestGrade ? GRADE_LABELS[bestGrade] : null;
  const scaled: CSSProperties = responsive ? { containerType: "inline-size" } : {};

  return (
    <div
      ref={cardRef}
      style={{
        ...scaled,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: responsive ? "100%" : WIDE_WIDTH * renderScale,
        height: responsive ? undefined : height * renderScale,
        aspectRatio: `${WIDE_WIDTH} / ${height}`,
        overflow: "hidden",
        borderRadius: u(isStory ? 0 : 20),
        boxSizing: "border-box",
        background: "linear-gradient(160deg, #0B2A22 0%, #0F3A2E 55%, #071D17 100%)",
        color: "#FFFFFF",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "100%",
          height: u(isStory ? 360 : 380),
          top: u(isStory ? 115 : 18),
          left: 0,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52,211,153,0.20) 0%, rgba(52,211,153,0.05) 45%, transparent 72%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          padding: isStory ? `${u(84)} ${u(16)}` : `${u(10)} ${u(16)} ${u(14)}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: u(24) }}>
          <span
            style={{
              display: "flex",
              borderRadius: u(999),
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.10)",
              padding: `${u(5)} ${u(10)}`,
              fontSize: u(11),
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            United States
          </span>
          <span style={{ display: "flex", color: "rgba(255,255,255,0.52)", fontSize: u(9), fontWeight: 700 }}>{host ?? siteHost()}</span>
        </div>

        {percent == null ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: u(8) }}>
            <span style={{ display: "flex", color: "#B9F5DE", fontSize: u(13), fontWeight: 900, letterSpacing: u(3), lineHeight: 1 }}>
              {`${GRADE_LABELS.royal.en.toUpperCase()} · ${GRADE_LABELS.okay.en.toUpperCase()} · ${GRADE_LABELS.stretched.en.toUpperCase()}`}
            </span>
            <span style={{ display: "flex", color: "#FFFFFF", fontSize: u(34), fontWeight: 900, lineHeight: 1.1 }}>Where can your income live best?</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,0.7)", fontSize: u(14), fontWeight: 700 }}>Rent, home prices and price levels in every US metro</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: u(6) }}>
            <span style={{ display: "flex", color: "#B9F5DE", fontSize: u(13), fontWeight: 900, letterSpacing: u(3), lineHeight: 1 }}>
              MY INCOME LIVES
            </span>
            <span style={{ display: "flex", color: "#FFFFFF", fontSize: u(22), fontWeight: 900, lineHeight: 1.1 }}>Comfortable or better in</span>
            <span style={{ display: "flex", color: "#34D399", fontSize: u(92), fontWeight: 900, letterSpacing: u(-3), lineHeight: 0.98 }}>{percent}%</span>
            <span style={{ display: "flex", color: "#FFFFFF", fontSize: u(16), fontWeight: 800, lineHeight: 1.15 }}>of US metro areas</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: u(10) }}>
          {percent != null && bestName && grade && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: u(4),
                borderRadius: u(10),
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.22)",
                padding: `${u(9)} ${u(11)}`,
              }}
            >
              <span style={{ display: "flex", color: "rgba(255,255,255,0.6)", fontSize: u(10), fontWeight: 700 }}>Lives best in</span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: u(8) }}>
                <span style={{ display: "flex", flex: 1, fontSize: u(14), fontWeight: 800, lineHeight: 1.15 }}>{bestName}</span>
                <span
                  style={{
                    display: "flex",
                    flexShrink: 0,
                    borderRadius: u(999),
                    background: grade.color,
                    color: "#0B0F0D",
                    padding: `${u(4)} ${u(9)}`,
                    fontSize: u(11),
                    fontWeight: 900,
                  }}
                >
                  {grade.en}
                </span>
              </div>
            </div>
          )}
          <span style={{ display: "flex", justifyContent: "center", color: "#D8F4E9", fontSize: u(13), fontWeight: 900, lineHeight: 1 }}>
            Where can you live best?
          </span>
        </div>
      </div>
    </div>
  );
}
