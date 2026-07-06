import type { RefObject } from "react";
import type { ResultDef } from "@/data/results";

export default function ResultCard({
  result, cardRef,
}: {
  result: ResultDef;
  cardRef?: RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={cardRef}
      style={{
        width: "360px", height: "450px",
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

      <div style={{ fontSize: "64px", lineHeight: 1, marginBottom: "18px" }}>{result.emoji}</div>

      <div style={{
        color: "#00C805", fontSize: "32px", fontWeight: 900,
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

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 20px", display: "flex", justifyContent: "center",
      }}>
        <span style={{
          color: "rgba(255,255,255,0.18)", fontSize: "11px",
          fontWeight: 600, letterSpacing: "0.1em",
        }}>
          {result.id}
        </span>
      </div>
    </div>
  );
}
