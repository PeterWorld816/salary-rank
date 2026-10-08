"use client";
import type { CSSProperties, RefObject } from "react";
import { formatReceiptDate, getReceiptGrade, receiptRankFromPercent } from "@/lib/receiptCard";
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
  gender?: string;
  ageBand?: string;
  location?: string;
  date?: string;
  noDataMessage?: string;
};

const PAPER = "#f7f4ea";
const INK = "#1b1b19";

function scaled(value: number): string {
  return `calc(100cqw / 360 * ${value})`;
}

function ReceiptCard({
  percent,
  rows,
  gender,
  ageBand,
  location,
  date,
}: Omit<ResultCardVisualProps, "variant" | "cardRef" | "noDataMessage">) {
  const rank = receiptRankFromPercent(percent ?? 0);
  const grade = getReceiptGrade(rank);
  const displayGender = gender?.toUpperCase() ?? "—";
  const displayAge = ageBand?.toUpperCase() ?? "—";
  const displayLocation = location?.toUpperCase() ?? "UNITED STATES";
  const displayDate = date ?? formatReceiptDate();
  const activeScale = grade.label.startsWith("A") ? "A" : grade.label.startsWith("B") ? "B" : grade.label.startsWith("C") ? "C" : grade.label;
  const paperStyle: CSSProperties = {
    position: "absolute",
    left: scaled(110 / 3),
    top: scaled(56 / 3),
    width: scaled(860 / 3),
    height: scaled(1330 / 3),
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: scaled(1),
    padding: `${scaled(14 / 3)} ${scaled(54 / 3)} 0`,
    backgroundColor: PAPER,
    color: INK,
    boxSizing: "border-box",
    fontFamily: '"Courier Prime", "Courier New", monospace',
  };
  const dashedRule: CSSProperties = {
    width: "100%",
    flexShrink: 0,
    borderTop: `${scaled(4 / 3)} dashed ${INK}`,
    margin: `${scaled(12 / 3)} 0`,
  };
  const rowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: scaled(4),
    fontSize: scaled(10),
    lineHeight: 1.4,
    textTransform: "uppercase",
  };
  const labelStyle: CSSProperties = {
    display: "flex",
    fontSize: scaled(8),
    fontWeight: 700,
    letterSpacing: "0.14em",
  };

  return (
    <div
      data-receipt-card="true"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1080 / 1350",
        overflow: "hidden",
        containerType: "inline-size",
        backgroundColor: grade.background,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          zIndex: 1,
          top: scaled((56 - 22) / 3),
          left: scaled(110 / 3),
          width: scaled(860 / 3),
          height: scaled(22 / 3),
          backgroundImage: `linear-gradient(135deg, transparent ${scaled(11 / 3)}, ${PAPER} 0) 0 0 / ${scaled(22 / 3)} ${scaled(22 / 3)}, linear-gradient(-135deg, transparent ${scaled(11 / 3)}, ${PAPER} 0) 0 0 / ${scaled(22 / 3)} ${scaled(22 / 3)}`,
        }}
      />
      <div style={paperStyle}>
        <header style={{ display: "flex", flexDirection: "column", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: scaled(58 / 3), lineHeight: 1, letterSpacing: "0.02em" }}>
            INCOME RECEIPT
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: scaled(10 / 3), color: "#5a5a52", fontSize: scaled(24 / 3), letterSpacing: "0.04em" }}>
            RANK MART · NO. {String(rank).padStart(3, "0")} · {displayDate}
          </div>
        </header>

        <div style={dashedRule} />
        <div style={rowStyle}>
          <span>SHOPPER</span>
          <strong>{displayGender} · {displayAge}</strong>
        </div>
        <div style={rowStyle}>
          <span>LOCATION</span>
          <strong>{displayLocation}</strong>
        </div>
        <div style={dashedRule} />

        <div style={{ display: "flex", alignItems: "center", gap: scaled(34 / 3) }}>
          <div style={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column" }}>
            <span style={labelStyle}>YOUR SPOT IN LINE</span>
            <span style={{ display: "flex", marginTop: scaled(6 / 3), fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: scaled(190 / 3), lineHeight: 0.9, letterSpacing: "-0.04em", whiteSpace: "nowrap" }}>
              #{rank}
            </span>
            <strong style={{ display: "flex", marginTop: scaled(6 / 3), fontSize: scaled(28 / 3), whiteSpace: "nowrap" }}>OUT OF 100 AMERICANS</strong>
            <span style={{ display: "flex", marginTop: scaled(12 / 3), color: "#3d3d37", fontSize: scaled(26 / 3), lineHeight: 1.3, whiteSpace: "nowrap" }}>{100 - rank} are behind you.</span>
          </div>
          <div
            aria-label={`${rank} out of 100 position`}
            style={{
              display: "flex",
              width: scaled(310 / 3),
              flex: "0 0 auto",
              flexWrap: "wrap",
              alignContent: "center",
            }}
          >
            {Array.from({ length: 100 }, (_, index) => {
              const position = index + 1;
              const isYou = position === rank;
              const ahead = position < rank;
              return (
                <span key={position} style={{ display: "flex", width: "10%", height: scaled(25 / 3), alignItems: "center", justifyContent: "center" }}>
                  <span
                    style={{
                      display: "flex",
                      width: scaled(isYou ? 20 / 3 : 18 / 3),
                      height: scaled(isYou ? 20 / 3 : 18 / 3),
                      borderRadius: "50%",
                      backgroundColor: isYou ? grade.background : ahead ? INK : "#d9d4c3",
                      ...(isYou ? { boxShadow: `0 0 0 ${scaled(5 / 3)} ${PAPER}, 0 0 0 ${scaled(9 / 3)} ${grade.background}`, transform: "scale(1.25)", zIndex: 2 } : {}),
                    }}
                  />
                </span>
              );
            })}
          </div>
        </div>

        <div style={dashedRule} />
        <div style={{ display: "flex", flexDirection: "column", gap: scaled(3 / 3) }}>
          {rows.map((row) => {
            const rowRank = receiptRankFromPercent(row.percent);
            return (
              <div key={row.label} style={rowStyle}>
                <span>{row.label}</span>
                <strong>#{rowRank} / 100</strong>
              </div>
            );
          })}
        </div>
        <div style={dashedRule} />

        <div style={{ display: "flex", alignItems: "center", gap: scaled(36 / 3) }}>
          <div style={{ display: "flex", width: scaled(200 / 3), height: scaled(200 / 3), flex: "0 0 auto", alignItems: "center", justifyContent: "center", border: `${scaled(8 / 3)} solid ${INK}`, fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: scaled(130 / 3), lineHeight: 1 }}>
            {grade.label}
          </div>
          <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column" }}>
            <span style={{ ...labelStyle, marginBottom: scaled(8 / 3) }}>INCOME GRADE</span>
            <strong style={{ display: "flex", fontSize: scaled(34 / 3), lineHeight: 1.2 }}>{grade.line}</strong>
            <div style={{ display: "flex", gap: scaled(10 / 3), marginTop: scaled(18 / 3) }}>
              {["S", "A", "B", "C", "D"].map((label) => {
                const selected = label === activeScale;
                return (
                  <span key={label} style={{ display: "flex", width: scaled(54 / 3), height: scaled(46 / 3), alignItems: "center", justifyContent: "center", border: `${scaled(3 / 3)} solid ${INK}`, backgroundColor: selected ? INK : "transparent", color: selected ? PAPER : INK, fontSize: scaled(26 / 3), fontWeight: 700 }}>
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ position: "relative", borderTop: `${scaled(4 / 3)} dashed ${INK}`, paddingTop: scaled(14 / 3) }}>
          <div aria-hidden="true" style={{ display: "flex", width: "100%", height: scaled(56 / 3), background: `repeating-linear-gradient(90deg, ${INK} 0 ${scaled(4 / 3)}, transparent ${scaled(4 / 3)} ${scaled(9 / 3)}, ${INK} ${scaled(9 / 3)} ${scaled(11 / 3)}, transparent ${scaled(11 / 3)} ${scaled(18 / 3)}, ${INK} ${scaled(18 / 3)} ${scaled(24 / 3)}, transparent ${scaled(24 / 3)} ${scaled(28 / 3)})` }} />
          <span style={{ display: "flex", position: "absolute", right: scaled(20), top: scaled(-54 / 3), transform: "rotate(-9deg)", border: `${scaled(7 / 3)} solid ${grade.background}`, borderRadius: scaled(12 / 3), padding: `${scaled(6 / 3)} ${scaled(20 / 3)}`, background: "rgba(247,244,234,.88)", color: grade.background, fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: scaled(40 / 3), letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
            {grade.stamp}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", fontSize: scaled(28 / 3), fontWeight: 700, textAlign: "center" }}>THANK YOU. COME RANK AGAIN.</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: scaled(8 / 3), color: "#5a5a52", fontSize: scaled(24 / 3), lineHeight: 1.35, textAlign: "center" }}>
          <span>WHERE DO YOU RANK?</span>
          <strong style={{ display: "flex", justifyContent: "center", fontSize: scaled(24 / 3) }}>{siteHost()}/us</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: scaled(8 / 3), color: "#77776d", fontSize: scaled(19 / 3), textAlign: "center" }}>
          For fun. Grades are not a measure of your worth.
        </div>
      </div>
    </div>
  );
}

export default function ResultCardVisual({
  variant,
  cardRef,
  percent,
  rows,
  gender,
  ageBand,
  location,
  date,
  noDataMessage,
}: ResultCardVisualProps) {
  const hasResult = percent != null;
  const backgroundColor = hasResult ? getReceiptGrade(receiptRankFromPercent(percent)).background : "#2f55ff";
  const isStory = variant === "story";
  return (
    <div
      ref={cardRef}
      data-receipt-capture="true"
      style={{
        containerType: "inline-size",
        position: "relative",
        width: "100%",
        aspectRatio: isStory ? `${STORY_WIDTH} / ${STORY_HEIGHT}` : `${WIDE_WIDTH} / ${WIDE_HEIGHT}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor,
      }}
    >
      {hasResult ? (
        isStory ? (
          <div style={{ position: "absolute", top: "13.02%", left: 0, width: "100%", height: "70.31%", containerType: "inline-size" }}>
            <ReceiptCard percent={percent} rows={rows} gender={gender} ageBand={ageBand} location={location} date={date} />
          </div>
        ) : (
          <ReceiptCard percent={percent} rows={rows} gender={gender} ageBand={ageBand} location={location} date={date} />
        )
      ) : (
        <div style={{ display: "flex", color: PAPER, fontFamily: '"Courier Prime", monospace', fontSize: 16 }}>{noDataMessage}</div>
      )}
    </div>
  );
}
