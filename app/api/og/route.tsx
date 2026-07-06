import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { decodeBreakdown } from "@/data/results";
import BrainChart from "@/components/BrainChart";

export const runtime = "edge";

const FALLBACK_COLOR = "#00C805";

export async function GET(req: NextRequest) {
  const d = new URL(req.url).searchParams.get("d") ?? "";
  const breakdown = decodeBreakdown(d);
  const top = breakdown[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px", height: "630px", background: "#0D0D0D",
          display: "flex", flexDirection: "row",
          alignItems: "center", justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        <div style={{
          position: "absolute", width: "600px", height: "600px",
          top: "15px", left: "300px",
          background: "radial-gradient(circle, rgba(0,200,5,0.08) 0%, transparent 65%)",
          borderRadius: "50%", display: "flex",
        }} />

        {!top ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 96, lineHeight: 1, marginBottom: 28, display: "flex" }}>🧠</div>
            <div style={{
              color: "#00C805", fontSize: 56, fontWeight: 900,
              letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 20,
              display: "flex", textAlign: "center", maxWidth: 900, justifyContent: "center",
            }}>
              🧠 뇌 구조 테스트
            </div>
            <div style={{
              color: "rgba(255,255,255,0.45)", fontSize: 24,
              display: "flex", textAlign: "center", maxWidth: 800, justifyContent: "center",
            }}>
              질문 8개로 알아보는 내 뇌 속 비율
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", marginRight: 70 }}>
              <BrainChart breakdown={breakdown} width={340} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", maxWidth: 560 }}>
              <div style={{ display: "flex", color: "rgba(255,255,255,0.4)", fontSize: 22, marginBottom: 10 }}>
                내 뇌 구조는?
              </div>
              <div style={{
                display: "flex", color: top.result.color ?? FALLBACK_COLOR, fontSize: 48, fontWeight: 900,
                letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 24,
              }}>
                {top.result.emoji} {top.result.title} {top.percent}%
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {breakdown.map((b) => (
                  <div key={b.result.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 999, display: "flex",
                      background: b.result.color ?? FALLBACK_COLOR,
                    }} />
                    <span style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.7)" }}>
                      {b.result.emoji} {b.result.title} {b.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
