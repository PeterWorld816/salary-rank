// 뇌 실루엣 안을 비율만큼 색으로 채우는 차트. 채우기(색상 영역)는 SVG path/rect로,
// 라벨은 그 위에 절대 위치시킨 HTML로 그린다 — next/og(satori)가 SVG <text>는 지원하지
// 않지만 절대 위치 div/span은 지원하기 때문. 이 구조 덕분에 브라우저(공유 카드)와
// edge 런타임(OG 이미지) 양쪽에서 동일한 컴포넌트를 그대로 재사용할 수 있다.
import type { BreakdownItem } from "@/data/results";
import { pick, type LangCode } from "@/lib/i18n";
import { BRAIN_PATH, BRAIN_VIEWBOX_W, BRAIN_VIEWBOX_H, BRAIN_TOP_Y, BRAIN_BOTTOM_Y, BRAIN_CENTER_X } from "@/lib/brainPath";

const FALLBACK_COLOR = "#00C805";
const MIN_LABEL_HEIGHT = 22; // px, 화면에 실제 렌더되는 크기 기준

function textColorFor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0D0D0D" : "#FFFFFF";
}

export default function BrainChart({
  breakdown, width = 240, lang = "ko",
}: {
  breakdown: BreakdownItem[];
  width?: number;
  lang?: LangCode;
}) {
  const scale = width / BRAIN_VIEWBOX_W;
  const height = BRAIN_VIEWBOX_H * scale;

  const fillTop = BRAIN_TOP_Y - 8;
  const fillBottom = BRAIN_BOTTOM_Y + 8;
  const fillHeight = fillBottom - fillTop;

  let cursor = fillTop;
  const bands = breakdown.map((b) => {
    const bandHeight = (b.percent / 100) * fillHeight;
    const band = { item: b, y: cursor, h: bandHeight };
    cursor += bandHeight;
    return band;
  });

  return (
    <div style={{ position: "relative", width: `${width}px`, height: `${height}px`, display: "flex" }}>
      <svg width={width} height={height} viewBox={`0 0 ${BRAIN_VIEWBOX_W} ${BRAIN_VIEWBOX_H}`}>
        <defs>
          <clipPath id="brainClip">
            <path d={BRAIN_PATH} />
          </clipPath>
        </defs>

        <path d={BRAIN_PATH} fill="#1a1a1a" />

        <g clipPath="url(#brainClip)">
          {bands.map((band) => (
            <rect
              key={band.item.result.id}
              x={0}
              y={band.y}
              width={BRAIN_VIEWBOX_W}
              height={band.h + 1}
              fill={band.item.result.color ?? FALLBACK_COLOR}
            />
          ))}
        </g>

        <path d={BRAIN_PATH} fill="none" stroke="#0D0D0D" strokeWidth={4} />
        <line
          x1={BRAIN_CENTER_X} y1={BRAIN_TOP_Y + 4}
          x2={BRAIN_CENTER_X} y2={BRAIN_BOTTOM_Y - 4}
          stroke="rgba(0,0,0,0.25)" strokeWidth={2}
        />
      </svg>

      {bands.map((band) => {
        const pixelY = band.y * scale;
        const pixelH = band.h * scale;
        if (pixelH < MIN_LABEL_HEIGHT) return null;
        const fill = textColorFor(band.item.result.color ?? FALLBACK_COLOR);
        const fontSize = pixelH < 32 ? 10 : 12;
        return (
          <div
            key={`label-${band.item.result.id}`}
            style={{
              position: "absolute", left: 0, top: `${pixelY}px`,
              width: `${width}px`, height: `${pixelH}px`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <span style={{ display: "flex", fontSize: `${fontSize}px`, fontWeight: 700, color: fill }}>
              {band.item.result.emoji} {pick(band.item.result.title, lang)} {band.item.percent}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
