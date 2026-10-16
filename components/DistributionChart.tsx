"use client";
// 전체 소득 분포 곡선 + "너 여기!" 마커. SVG는 path/line/circle만 쓰고 텍스트는
// 절대 위치 div로 올린다 — SVG <text>가 폰트에 따라 깨지는 걸 피하기 위함.
//
// `animate`: the curve draws in left→right once on mount (CSS, app/globals.css's
// .chart-draw-in), and the marker slides along the curve (tweened in t-space,
// so it follows the curve) with a tiny bounce on arrival. The "ahead of you"
// region left of the marker gets the accent gradient and grows/shrinks with
// it; the right side stays dim. Movement is transform-only — the labels never
// change layout. The caller passes an already-settled value (see
// lib/useSettledValue.ts); `hold` keeps the marker parked at the left edge
// until the first one arrives.
import { useId } from "react";
import {
  buildDistributionPaths,
  pointAtT,
  valueToT,
  averageTickX,
  CHART_VIEWBOX_W,
  CHART_VIEWBOX_H,
  CHART_BASELINE_Y,
  CHART_MIN_SALARY,
  CHART_MAX_SALARY,
} from "@/lib/distributionPath";
import { formatTemplate, translations, type LangCode } from "@/lib/i18n";
import { easeOutCubic, easeOutSoftBack, useCountUp } from "@/lib/useCountUp";

const ACCENT = "#059669";
const ACCENT_ON_DARK = "#34D399";
// The "you're here" marker gets its own gold accent, distinct from the mint
// curve/map colors, so it reads as "you" rather than blending into the data.
const MARKER_ACCENT = "#FBBF24";

const MARKER_SLIDE_MS = 850;
const NUMBER_MS = 700;

export default function DistributionChart({
  monthlySalary,
  width = 280,
  lang = "ko",
  dark = false,
  averageValue,
  min = CHART_MIN_SALARY,
  max = CHART_MAX_SALARY,
  animate = false,
  hold = false,
  aheadPercent,
  glowAhead = false,
}: {
  monthlySalary: number;
  width?: number;
  lang?: LangCode;
  dark?: boolean;
  averageValue: number;
  min?: number;
  max?: number;
  animate?: boolean;
  hold?: boolean;
  // "Ahead of N%" label next to the marker (100 − the card's top-X%).
  aheadPercent?: number;
  // Below-median encouragement: softly light up the road ahead (right of
  // the marker).
  glowAhead?: boolean;
}) {
  const t = translations[lang];
  const uid = useId().replace(/:/g, "");
  const scale = width / CHART_VIEWBOX_W;
  const height = CHART_VIEWBOX_H * scale;
  const accent = dark ? ACCENT_ON_DARK : ACCENT;
  const axisColor = dark ? "rgba(255,255,255,0.18)" : "#E5E7EB";
  const labelColor = dark ? "rgba(255,255,255,0.4)" : "#9CA3AF";

  const { linePath, areaPath } = buildDistributionPaths();
  const targetT = valueToT(monthlySalary, min, max);
  const tweenT = useCountUp(animate && !hold ? targetT : null, MARKER_SLIDE_MS, {
    initial: animate ? 0 : undefined,
    easing: easeOutSoftBack,
  });
  const marker = pointAtT(animate ? tweenT ?? 0 : targetT);
  const finalMarker = pointAtT(targetT);
  const avgX = averageTickX(averageValue, min, max);

  const ahead = useCountUp(aheadPercent != null && !hold ? aheadPercent : null, NUMBER_MS, {
    initial: animate ? 0 : undefined,
    easing: easeOutCubic,
  });
  const aheadShown = Math.round(Math.min(100, Math.max(0, ahead ?? 0)));

  const markerPx = { x: marker.x * scale, y: marker.y * scale };
  const avgPx = avgX * scale;
  const pillX = Math.min(Math.max(markerPx.x - 34, 0), width - 68);
  // The "ahead" label sits just under the baseline (clear of the pill, which
  // rides the curve), on whichever side of the marker line has room.
  const aheadOnLeft = markerPx.x > 92;
  const baselinePx = CHART_BASELINE_Y * scale;

  return (
    <div
      data-chart-root
      // Where the marker will come to rest (CSS px within this element) —
      // ResultCelebration reads these to launch its burst from there.
      data-marker-x={(finalMarker.x * scale).toFixed(1)}
      data-marker-y={(finalMarker.y * scale).toFixed(1)}
      style={{ position: "relative", width: `${width}px`, height: `${height + 22}px`, display: "flex" }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${CHART_VIEWBOX_W} ${CHART_VIEWBOX_H}`} aria-hidden>
        <defs>
          <linearGradient id={`ahead-${uid}`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={Math.max(marker.x, 1)} y2={0}>
            <stop offset="0%" stopColor={accent} stopOpacity={0.06} />
            <stop offset="100%" stopColor={accent} stopOpacity={0.42} />
          </linearGradient>
          {/* Full-width rects slid with transform, never resized. */}
          <clipPath id={`left-${uid}`}>
            <rect x={0} y={0} width={CHART_VIEWBOX_W} height={CHART_VIEWBOX_H} transform={`translate(${marker.x - CHART_VIEWBOX_W} 0)`} />
          </clipPath>
          <clipPath id={`right-${uid}`}>
            <rect x={0} y={0} width={CHART_VIEWBOX_W} height={CHART_VIEWBOX_H} transform={`translate(${marker.x} 0)`} />
          </clipPath>
        </defs>

        <g className={animate ? "chart-draw-in" : undefined}>
          <path d={areaPath} fill={accent} opacity={0.07} />
          <path d={areaPath} fill={`url(#ahead-${uid})`} clipPath={`url(#left-${uid})`} />
          {glowAhead && <path className="chart-ahead-glow" d={areaPath} fill={MARKER_ACCENT} clipPath={`url(#right-${uid})`} />}
          <path d={linePath} fill="none" stroke={accent} strokeWidth={2.5} />
        </g>

        <line x1={0} y1={CHART_BASELINE_Y} x2={CHART_VIEWBOX_W} y2={CHART_BASELINE_Y} stroke={axisColor} strokeWidth={1.5} />

        {/* 전체 평균 위치 눈금 */}
        <line
          x1={avgX} y1={CHART_BASELINE_Y - 6} x2={avgX} y2={CHART_BASELINE_Y + 6}
          stroke={labelColor} strokeWidth={1.5}
        />

        {/* 마커: 세로 가이드 라인 + 점 — 골드로 지도/그래프의 민트색과 구분 */}
        <line
          x1={marker.x} y1={marker.y} x2={marker.x} y2={CHART_BASELINE_Y}
          stroke={MARKER_ACCENT} strokeWidth={1.5}
        />
        <circle cx={marker.x} cy={marker.y} r={5.5} fill={MARKER_ACCENT} />
        <circle cx={marker.x} cy={marker.y} r={5.5} fill="none" stroke={dark ? "#0D0D0D" : "#FFFFFF"} strokeWidth={2} />
      </svg>

      {/* "너 여기!" 라벨 — 마커 위에 transform으로 올린다 */}
      <div
        data-chart-marker
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate3d(${pillX}px, ${Math.max(markerPx.y - 30, 0)}px, 0)`,
          width: "68px",
          display: "flex", justifyContent: "center",
        }}
      >
        <span style={{
          display: "flex", fontSize: "11px", fontWeight: 700, color: "#1A1300",
          background: MARKER_ACCENT, borderRadius: "999px", padding: "3px 9px", whiteSpace: "nowrap",
        }}>
          {t.distributionYouAreHere}
        </span>
      </div>

      {aheadPercent != null && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate3d(${aheadOnLeft ? markerPx.x - 5 : markerPx.x + 5}px, ${baselinePx + 5}px, 0)${aheadOnLeft ? " translateX(-100%)" : ""}`,
            opacity: hold ? 0 : 1,
            transition: "opacity 300ms ease-out",
            display: "flex",
          }}
        >
          <span style={{ display: "flex", fontSize: "10px", fontWeight: 600, color: accent, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            {formatTemplate(t.distributionAheadTemplate, { percent: aheadShown })}
          </span>
        </div>
      )}

      {/* 평균 눈금 라벨 */}
      <div style={{
        position: "absolute", left: `${Math.min(Math.max(avgPx - 20, 0), width - 40)}px`,
        top: `${height - 2}px`, width: "40px", display: "flex", justifyContent: "center",
      }}>
        <span style={{ display: "flex", fontSize: "10px", color: labelColor }}>{t.distributionAverageTick}</span>
      </div>

      {/* 축 좌우 라벨 */}
      <div style={{ position: "absolute", left: 0, top: `${height - 2}px`, display: "flex" }}>
        <span style={{ display: "flex", fontSize: "10px", color: labelColor }}>{t.distributionLowLabel}</span>
      </div>
      <div style={{ position: "absolute", right: 0, top: `${height - 2}px`, display: "flex" }}>
        <span style={{ display: "flex", fontSize: "10px", color: labelColor }}>{t.distributionHighLabel}</span>
      </div>
    </div>
  );
}
