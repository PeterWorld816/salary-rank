import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getResultById } from "@/data/results";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const result = getResultById(id);

  const emoji = result?.emoji ?? "❓";
  const title = result?.title ?? "(app title placeholder)";
  const desc  = result?.description ?? "(app description placeholder)";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px", height: "630px", background: "#0D0D0D",
          display: "flex", flexDirection: "column",
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

        <div style={{ fontSize: 96, lineHeight: 1, marginBottom: 28, display: "flex" }}>
          {emoji}
        </div>

        <div style={{
          color: "#00C805", fontSize: 56, fontWeight: 900,
          letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 20,
          display: "flex", textAlign: "center", maxWidth: 900, justifyContent: "center",
        }}>
          {title}
        </div>

        <div style={{
          color: "rgba(255,255,255,0.45)", fontSize: 24,
          display: "flex", textAlign: "center", maxWidth: 800, justifyContent: "center",
        }}>
          {desc}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
