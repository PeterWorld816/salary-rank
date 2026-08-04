// 전체 소득 분포 곡선 + "너 여기!" 마커. SVG는 path/line/circle만 쓰고 텍스트는
// 절대 위치 div로 올린다 — html-to-image로 카드를 PNG로 저장할 때 SVG <text>가
// 폰트에 따라 깨지는 걸 피하기 위함. 브라우저 화면과 공유용 카드 양쪽에서 같은
// 컴포넌트를 그대로 재사용할 수 있다.
import {
  buildDistributionPaths,
  markerPosition,
  averageTickX,
  CHART_VIEWBOX_W,
  CHART_VIEWBOX_H,
  CHART_BASELINE_Y,
  CHART_MIN_SALARY,
  CHART_MAX_SALARY,
} from "@/lib/distributionPath";
import { translations, type LangCode } from "@/lib/i18n";

const ACCENT = "#059669";
const ACCENT_ON_DARK = "#34D399";
// The "you're here" marker gets its own gold accent, distinct from the mint
// curve/map colors, so it reads as "you" rather than blending into the data.
const MARKER_ACCENT = "#FBBF24";

export default function DistributionChart({
  monthlySalary,
  width = 280,
  lang = "ko",
  dark = false,
  averageValue,
  min = CHART_MIN_SALARY,
  max = CHART_MAX_SALARY,
}: {
  monthlySalary: number;
  width?: number;
  lang?: LangCode;
  dark?: boolean;
  averageValue: number;
  min?: number;
  max?: number;
}) {
  const t = translations[lang];
  const scale = width / CHART_VIEWBOX_W;
  const height = CHART_VIEWBOX_H * scale;
  const accent = dark ? ACCENT_ON_DARK : ACCENT;
  const axisColor = dark ? "rgba(255,255,255,0.18)" : "#E5E7EB";
  const labelColor = dark ? "rgba(255,255,255,0.4)" : "#9CA3AF";

  const { linePath, areaPath } = buildDistributionPaths();
  const marker = markerPosition(monthlySalary, min, max);
  const avgX = averageTickX(averageValue, min, max);

  const markerPx = { x: marker.x * scale, y: marker.y * scale };
  const avgPx = avgX * scale;

  return (
    <div style={{ position: "relative", width: `${width}px`, height: `${height + 22}px`, display: "flex" }}>
      <svg width={width} height={height} viewBox={`0 0 ${CHART_VIEWBOX_W} ${CHART_VIEWBOX_H}`}>
        <path d={areaPath} fill={accent} opacity={0.14} />
        <path d={linePath} fill="none" stroke={accent} strokeWidth={2.5} />

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

      {/* "너 여기!" 라벨 — 마커 위에 절대 위치 */}
      <div
        style={{
          position: "absolute",
          left: `${Math.min(Math.max(markerPx.x - 34, 0), width - 68)}px`,
          top: `${Math.max(markerPx.y - 30, 0)}px`,
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
