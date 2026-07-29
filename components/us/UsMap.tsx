"use client";
// Shared choropleth map for /us (50 states) and /us/[state] (counties within
// one state). Dark/neon styling lives entirely here — deliberately separate
// from the light-theme tokens in app/globals.css used by /quiz and /result.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { geoMercator } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";

const ACCENT = "#34D399";

export type UsMapFeatureProps = { name: string };

export default function UsMap({
  geo,
  fit = false,
  height = 520,
  getHref,
  getFill,
  getLabel,
}: {
  geo: FeatureCollection<Geometry, UsMapFeatureProps>;
  // false (default) = whole-US Albers projection (for the 50-state map).
  // true = fit the projection to just the given features (for a single
  // state's counties, so it fills the frame instead of sitting tiny inside
  // a nationwide frame).
  fit?: boolean;
  height?: number;
  getHref: (id: string) => string;
  getFill: (id: string) => string;
  getLabel: (id: string) => string;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState<{ label: string; x: number; y: number } | null>(null);

  const projection = useMemo(() => {
    if (!fit) return "geoAlbersUsa";
    return (width: number, h: number) => geoMercator().fitSize([width, h], geo as any);
  }, [fit, geo]);

  return (
    <div className="relative w-full select-none" style={{ height }} data-us-map>

      <ComposableMap
        projection={projection}
        width={960}
        height={height}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geo}>
          {({ geographies }) =>
            geographies.map((g) => {
              const id = String(g.id);
              return (
                <Geography
                  key={g.rsmKey}
                  geography={g}
                  onClick={() => router.push(getHref(id))}
                  onMouseEnter={(e) => setHovered({ label: getLabel(id), x: e.clientX, y: e.clientY })}
                  onMouseMove={(e) => setHovered((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    default: {
                      fill: getFill(id),
                      stroke: "#050607",
                      strokeWidth: 0.75,
                      outline: "none",
                      cursor: "pointer",
                      transition: "fill 150ms ease, filter 150ms ease, transform 150ms ease",
                      transformBox: "fill-box",
                      transformOrigin: "center",
                    },
                    hover: {
                      fill: ACCENT,
                      stroke: "#050607",
                      strokeWidth: 1,
                      outline: "none",
                      cursor: "pointer",
                      filter: `drop-shadow(0 0 10px ${ACCENT}) drop-shadow(0 0 22px rgba(52,211,153,0.55))`,
                      transform: "scale(1.035)",
                      transformBox: "fill-box",
                      transformOrigin: "center",
                    },
                    pressed: {
                      fill: "#10B981",
                      stroke: "#050607",
                      strokeWidth: 1,
                      outline: "none",
                      transformBox: "fill-box",
                      transformOrigin: "center",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {hovered && (
        <div
          className="pointer-events-none fixed z-50 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-semibold text-white shadow-lg"
          style={{ left: hovered.x + 14, top: hovered.y + 14, background: "rgba(5,6,7,0.95)", border: `1px solid ${ACCENT}` }}
        >
          {hovered.label}
        </div>
      )}
    </div>
  );
}
