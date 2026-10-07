import type { CSSProperties, RefObject } from "react";
import { getReceiptGrade, receiptRankFromPercent } from "@/lib/receiptCard";
import { siteHost } from "@/components/us/ShareCardBits";

export const WIDE_WIDTH = 360;
export const WIDE_HEIGHT = 450;
export const STORY_WIDTH = 360;
export const STORY_HEIGHT = 640;
export const CARD_PREVIEW_MAX_WIDTH = 440;

export type ReceiptRankRow = {
  label: string;
  percent: number;
};

export type ResultCardVisualProps = {
  variant: "wide" | "story";
  cardRef?: RefObject<HTMLDivElement>;
  percent: number | null;
  rows: ReceiptRankRow[];
  noDataMessage?: string;
};

function ReceiptCard({ percent, rows }: { percent: number; rows: ReceiptRankRow[] }) {
  const rank = receiptRankFromPercent(percent);
  const grade = getReceiptGrade(rank);
  const scaled = (value: number) => `calc(100cqw / 360 * ${value})`;
  const paper: CSSProperties = {
    display: "flex",
    width: "100%",
    height: "100%",
    flexDirection: "column",
    justifyContent: "space-evenly",
    gap: scaled(7),
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#f7f4ea",
    color: "#1b1b18",
    padding: `${scaled(16)} ${scaled(22)}`,
    fontFamily: '"Courier Prime", "Courier New", monospace',
    boxSizing: "border-box",
  };

  return (
    <div style={paper}>
      <div style={{ display: "flex", flexDirection: "column", gap: scaled(3), borderBottom: `${scaled(1)} dashed #9c998e`, paddingBottom: scaled(6) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: scaled(20), letterSpacing: "0.01em" }}>
            INCOME RECEIPT
          </span>
          <span style={{ display: "flex", fontSize: scaled(9), fontWeight: 700 }}>US · 001</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: scaled(8.5), fontWeight: 700, textTransform: "uppercase" }}>
          <span style={{ display: "flex" }}>SHOPPER</span>
          <span style={{ display: "flex" }}>100 AMERICANS</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: scaled(8), paddingTop: scaled(4) }}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ display: "flex", fontSize: scaled(9), fontWeight: 700, letterSpacing: "0.05em" }}>YOUR PLACE IN LINE</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: scaled(5), fontFamily: '"Archivo Black", Impact, sans-serif', lineHeight: 1 }}>
            <span style={{ display: "flex", fontSize: scaled(64), letterSpacing: "-0.06em" }}>#{rank}</span>
            <span style={{ display: "flex", fontSize: scaled(17) }}>/ 100</span>
          </div>
          <span style={{ display: "flex", fontSize: scaled(9) }}>{100 - rank} behind you</span>
        </div>

        <div
          aria-label={`${rank} out of 100 position`}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignContent: "center",
            justifyContent: "center",
            width: scaled(110),
            height: scaled(66),
            flexShrink: 0,
            gap: `${scaled(2)} ${scaled(4)}`,
          }}
        >
          {Array.from({ length: 100 }, (_, index) => {
            const position = index + 1;
            const isYou = position === rank;
            const ahead = position < rank;
            return (
              <span
                key={position}
                style={{
                  display: "flex",
                  flex: "0 0 auto",
                  width: scaled(isYou ? 8 : 6),
                  height: scaled(isYou ? 8 : 6),
                  borderRadius: "50%",
                  backgroundColor: isYou ? grade.background : ahead ? "#25251f" : "#d7d0bd",
                  border: isYou ? `${scaled(1.5)} solid #1b1b18` : undefined,
                  boxShadow: isYou ? `0 0 0 ${scaled(1.5)} ${grade.background}` : undefined,
                  boxSizing: "border-box",
                }}
              />
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: scaled(4), borderTop: `${scaled(1)} dashed #9c998e`, borderBottom: `${scaled(1)} dashed #9c998e`, padding: `${scaled(6)} 0` }}>
        <div style={{ display: "flex", alignItems: "center", gap: scaled(9) }}>
          <div style={{ display: "flex", width: scaled(64), height: scaled(64), flexShrink: 0, alignItems: "center", justifyContent: "center", transform: "rotate(-8deg)", border: `${scaled(2.5)} solid ${grade.background}`, color: grade.background, fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: scaled(40), lineHeight: 1 }}>
            {grade.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: scaled(2) }}>
            <span style={{ display: "flex", fontSize: scaled(8), fontWeight: 700, letterSpacing: "0.06em" }}>INCOME GRADE</span>
            <span style={{ display: "flex", fontSize: scaled(9.5), fontWeight: 700, lineHeight: 1.15 }}>{grade.line}</span>
            <div style={{ display: "flex", gap: scaled(2), marginTop: scaled(1) }}>
              {["S", "A+", "A", "B+", "B", "C+", "C", "D"].map((label) => (
                <span key={label} style={{ display: "flex", minWidth: scaled(10), justifyContent: "center", border: `${scaled(0.5)} solid #77746b`, padding: `0 ${scaled(1)}`, fontSize: scaled(6.5), fontWeight: label === grade.label ? 700 : 400, backgroundColor: label === grade.label ? grade.background : "transparent", color: label === grade.label ? "#fff" : "#1b1b18" }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: scaled(2), padding: `${scaled(1)} 0` }}>
        {rows.map((row) => {
          const rowRank = receiptRankFromPercent(row.percent);
          return (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: scaled(6), fontSize: scaled(11.5) }}>
              <span style={{ display: "flex", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
              <span style={{ display: "flex", flexShrink: 0, fontWeight: 700 }}>#{rowRank} / 100</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", position: "relative", minHeight: scaled(28), alignItems: "center", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ display: "flex", width: "100%", height: scaled(22), alignItems: "stretch", gap: scaled(1) }}>
          {Array.from({ length: 64 }, (_, index) => (
            <span key={index} style={{ display: "flex", width: scaled(index % 7 === 0 ? 2 : index % 3 === 0 ? 1.5 : 1), backgroundColor: "#1b1b18", flexShrink: 0 }} />
          ))}
        </div>
        <span
          style={{
            display: "flex",
            position: "absolute",
            right: scaled(8),
            top: scaled(1),
            transform: "rotate(-9deg)",
            border: `${scaled(2)} solid ${grade.background}`,
            color: grade.background,
            backgroundColor: "#f7f4ea",
            padding: `${scaled(4)} ${scaled(7)}`,
            fontFamily: '"Archivo Black", Impact, sans-serif',
            fontSize: scaled(10),
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {grade.stamp}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: scaled(7.5), lineHeight: 1.1 }}>
        <span style={{ display: "flex" }}>THANK YOU. COME RANK AGAIN.</span>
        <span style={{ display: "flex", fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: scaled(8) }}>{siteHost()}</span>
      </div>
      <span style={{ display: "flex", justifyContent: "center", fontSize: scaled(6), lineHeight: 1.1, textAlign: "center" }}>
        For fun. Grades are not a measure of your worth.
      </span>
    </div>
  );
}

export default function ResultCardVisual({ variant, cardRef, percent, rows, noDataMessage }: ResultCardVisualProps) {
  const isStory = variant === "story";
  const backgroundColor = percent == null ? "#2f55ff" : getReceiptGrade(receiptRankFromPercent(percent)).background;
  const rootStyle: CSSProperties = {
    containerType: "inline-size",
    width: "100%",
    height: "auto",
    aspectRatio: isStory ? `${STORY_WIDTH} / ${STORY_HEIGHT}` : `${WIDE_WIDTH} / ${WIDE_HEIGHT}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor,
    padding: isStory ? "0" : "calc(100cqw / 360 * 12)",
    boxSizing: "border-box",
  };

  return (
    <div ref={cardRef} data-receipt-card="true" style={rootStyle}>
      {percent == null ? (
        <div style={{ display: "flex", color: "#f7f4ea", fontFamily: '"Courier Prime", monospace', fontSize: 16 }}>{noDataMessage}</div>
      ) : isStory ? (
        <div style={{ display: "flex", width: "100%", height: "70.3125%", maxHeight: "calc(100% - 190px)", aspectRatio: "360 / 450", containerType: "inline-size" }}>
          <ReceiptCard percent={percent} rows={rows} />
        </div>
      ) : (
        <div style={{ display: "flex", width: "100%", height: "100%", containerType: "inline-size" }}>
          <ReceiptCard percent={percent} rows={rows} />
        </div>
      )}
    </div>
  );
}
