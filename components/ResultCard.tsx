import type { RefObject } from "react";
import type { ResultDef, BreakdownItem } from "@/data/results";
import BrainChart from "@/components/BrainChart";

export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 450;
export const BREAKDOWN_CARD_HEIGHT = 680;

const FALLBACK_COLOR = "#00C805";

function BreakdownCard({ breakdown }: { breakdown: BreakdownItem[] }) {
  const top = breakdown[0];

  return (
    <>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginBottom: "6px" }}>
        내 뇌 구조는?
      </div>

      <div style={{
        color: top.result.color ?? FALLBACK_COLOR, fontSize: "26px", fontWeight: 900,
        letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: "8px",
        textAlign: "center", padding: "0 28px",
      }}>
        {top.result.emoji} {top.result.title} {top.percent}%
      </div>

      <div style={{
        color: "rgba(255,255,255,0.5)", fontSize: "12px",
        textAlign: "center", lineHeight: 1.5, padding: "0 34px", marginBottom: "18px",
      }}>
        {top.result.description}
      </div>

      <div style={{ marginBottom: "18px" }}>
        <BrainChart breakdown={breakdown} width={220} />
      </div>

      {/* 범례 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "260px" }}>
        {breakdown.map((b) => (
          <div key={b.result.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
              background: b.result.color ?? FALLBACK_COLOR,
            }} />
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", flex: 1 }}>
              {b.result.emoji} {b.result.title}
            </span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
              {b.percent}%
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function SingleResultCard({ result }: { result: ResultDef }) {
  return (
    <>
      <div style={{ fontSize: "64px", lineHeight: 1, marginBottom: "18px" }}>{result.emoji}</div>

      <div style={{
        color: result.color ?? FALLBACK_COLOR, fontSize: "32px", fontWeight: 900,
        letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: "14px",
        textAlign: "center", padding: "0 28px",
      }}>
        {result.title}
      </div>

      <div style={{
        color: "rgba(255,255,255,0.5)", fontSize: "14px",
        textAlign: "center", lineHeight: 1.55, padding: "0 32px",
      }}>
        {result.description}
      </div>
    </>
  );
}

export default function ResultCard({
  result, breakdown, cardRef,
}: {
  result?: ResultDef;
  breakdown?: BreakdownItem[];
  cardRef?: RefObject<HTMLDivElement>;
}) {
  const height = breakdown ? BREAKDOWN_CARD_HEIGHT : CARD_HEIGHT;

  return (
    <div
      ref={cardRef}
      style={{
        width: `${CARD_WIDTH}px`, height: `${height}px`,
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
        top: "90px", left: "30px",
        background: "radial-gradient(circle, rgba(0,200,5,0.1) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      {breakdown && breakdown.length > 0
        ? <BreakdownCard breakdown={breakdown} />
        : result
          ? <SingleResultCard result={result} />
          : null}

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 20px", display: "flex", justifyContent: "center",
      }}>
        <span style={{
          color: "rgba(255,255,255,0.18)", fontSize: "11px",
          fontWeight: 600, letterSpacing: "0.1em",
        }}>
          🧠 뇌 구조 테스트
        </span>
      </div>
    </div>
  );
}
