"use client";
// Shared choropleth map for /us (50 states) and /us/[state] (counties within
// one state). Dark/neon styling lives entirely here — deliberately separate
// from the light-theme tokens in app/globals.css used by /quiz and /result.
import { useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import type { ProjectionFunction } from "react-simple-maps";
import { geoMercator, geoArea } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { getStateByFips } from "@/data/us/stateMeta";

const ACCENT = "#34D399";
// Window within which a second tap counts as a double-tap rather than two
// separate single taps — only used in zoomable mode, see handleFeatureClick.
const DOUBLE_TAP_MS = 280;

// How many of a state's largest-by-area counties get a persistent name
// label on the county map (fit=true) — the rest stay label-free and rely
// on the existing hover/tap tooltip.
const COUNTY_LABEL_TOP_N = 18;

const MIN_STATE_LABEL_FONT = 8;
const MAX_STATE_LABEL_FONT = 13;

// The cramped Northeast cluster (RI/CT/MA/NH/VT + the DE/MD/DC trio) sits
// close enough together in Albers USA that even a shrunk font still
// collides — nudge those labels apart in the map's internal 960-wide
// coordinate space (independent of the on-screen CSS scale).
const SMALL_STATE_LABEL_OFFSET: Partial<Record<string, [number, number]>> = {
  VT: [-8, -6],
  NH: [8, -4],
  MA: [6, -10],
  RI: [14, 10],
  CT: [-6, 12],
  NJ: [4, 0],
  DE: [8, -2],
  MD: [-4, -6],
  DC: [10, 14],
};

export type UsMapFeatureProps = { name: string };

// A single point overlaid on top of the geography layer — e.g. the city a
// visitor picked inside the selected county. Positioned via react-simple-
// maps' own <Marker>, which reads the same active projection (Albers or the
// `fit`-computed Mercator below) from ComposableMap's context, so it always
// lands in the right spot without this component doing its own lng/lat ->
// screen-space math.
export type UsMapMarker = { id: string; lng: number; lat: number; label?: string };

// Gold, not mint — mint is already the hover/selection color for county
// fills, so a marker needs a color that never blends into the map itself.
const MARKER_ACCENT = "#FBBF24";

function MapPinMarker({ label, clickable, hovered }: { label?: string; clickable?: boolean; hovered?: boolean }) {
  return (
    <g style={{ pointerEvents: clickable ? "auto" : "none", cursor: clickable ? "pointer" : "default" }}>
      <path
        d="M0,0 C0,0 -8,-14 -8,-20 A8,8 0 1 1 8,-20 C8,-14 0,0 0,0 Z"
        fill={MARKER_ACCENT}
        stroke="#050607"
        strokeWidth={1.5}
        style={{
          filter: `drop-shadow(0 0 6px ${MARKER_ACCENT}) drop-shadow(0 2px 5px rgba(0,0,0,0.6))`,
          transform: hovered ? "scale(1.15)" : "scale(1)",
          transformOrigin: "0px 0px",
          transition: "transform 120ms ease",
        }}
      />
      <circle cx={0} cy={-20} r={3} fill="#050607" />
      {/* Bigger invisible hit target than the pin's own path — the pin
          glyph itself is too thin to reliably tap on a phone screen. */}
      {clickable && <circle cx={0} cy={-14} r={18} fill="transparent" />}
      {label && (
        <text
          x={0}
          y={-28}
          textAnchor="middle"
          style={{
            fontSize: 11,
            fontWeight: 800,
            fill: "#fff",
            stroke: "rgba(5,6,7,0.75)",
            strokeWidth: 3,
            paintOrder: "stroke",
            pointerEvents: "none",
          }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export default function UsMap({
  geo,
  fit = false,
  height = 520,
  zoomable = false,
  minZoom = 1,
  maxZoom = 8,
  onSelect,
  getFill,
  getLabel,
  markers = [],
  onMarkerSelect,
}: {
  geo: FeatureCollection<Geometry, UsMapFeatureProps>;
  // false (default) = whole-US Albers projection (for the 50-state map).
  // true = fit the projection to just the given features (for a single
  // state's counties, so it fills the frame instead of sitting tiny inside
  // a nationwide frame).
  fit?: boolean;
  height?: number;
  // Wraps the map in react-simple-maps' ZoomableGroup for pinch-zoom +
  // drag-pan, plus a double-tap-to-toggle-zoom gesture — used for the
  // mobile "view as map" toggle, where small states are otherwise too
  // cramped to tap accurately. Leave false (default) for the desktop map,
  // which keeps its original plain/unzoomed click behavior untouched.
  zoomable?: boolean;
  minZoom?: number;
  maxZoom?: number;
  onSelect: (id: string) => void;
  getFill: (id: string) => string;
  getLabel: (id: string) => string;
  // Optional pins drawn on top of the geography layer — see UsMapMarker.
  markers?: UsMapMarker[];
  // Makes each marker itself clickable (e.g. picking a town) instead of
  // purely decorative — omit to keep markers as plain, non-interactive pins.
  onMarkerSelect?: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<{ label: string; x: number; y: number } | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 0]);
  // Timestamp of the last accepted tap, used to tell a double-tap (zoom
  // toggle) apart from two independent single taps (select) — see below.
  const lastTapRef = useRef(0);

  const width = 960;

  // react-simple-maps treats a function `projection` prop as an
  // already-configured d3-geo projection instance, not a (width, height) =>
  // projection factory — if you hand it a factory, it forwards that raw
  // function straight into d3-geo's geoPath().projection(...), which then
  // fails looking for a .stream method that a plain function doesn't have
  // ("projectionStream is not a function"). So the fit must be computed here
  // with the same width/height passed to ComposableMap below, not deferred.
  // @types/react-simple-maps types the function form of `projection` as a
  // (width, height, config) => GeoProjection factory, but the v3.0.0 runtime
  // never actually calls it that way (see makeProjection in its dist bundle)
  // — whatever we pass is used as-is. The cast below just works around that
  // stale type; the value itself is a real, already-fitted projection.
  const projection = useMemo(() => {
    if (!fit) return "geoAlbersUsa";
    return geoMercator().fitSize([width, height], geo as any) as unknown as ProjectionFunction;
  }, [fit, geo, height]);

  // State map (fit=false): every state gets its 2-letter abbreviation,
  // sized off its own geographic area (in a log scale, since area spans ~4
  // orders of magnitude from DC to Alaska) so tiny states get smaller text.
  const stateLabelFontScale = useMemo(() => {
    if (fit) return null;
    const logAreas = geo.features.map((f) => Math.log(Math.max(geoArea(f as Feature), 1e-7)));
    return { min: Math.min(...logAreas), max: Math.max(...logAreas) };
  }, [fit, geo]);

  function stateLabelFontSize(feature: Feature): number {
    if (!stateLabelFontScale) return MAX_STATE_LABEL_FONT;
    const { min, max } = stateLabelFontScale;
    const logArea = Math.log(Math.max(geoArea(feature), 1e-7));
    const t = max > min ? (logArea - min) / (max - min) : 1;
    return MIN_STATE_LABEL_FONT + t * (MAX_STATE_LABEL_FONT - MIN_STATE_LABEL_FONT);
  }

  // County map (fit=true): only the top N largest-by-area counties get a
  // persistent label — everything else stays tooltip-only (see `hovered`).
  // A single-feature map (TownPickerMap's one-county-polygon view) skips
  // this entirely — the page heading already names the county, and the
  // label would otherwise sit right on top of any city marker.
  const countyLabelIds = useMemo(() => {
    if (!fit || geo.features.length <= 1) return null;
    return new Set(
      geo.features
        .map((f) => ({ id: String(f.id), area: geoArea(f as Feature) }))
        .sort((a, b) => b.area - a.area)
        .slice(0, COUNTY_LABEL_TOP_N)
        .map((f) => f.id)
    );
  }, [fit, geo]);

  function persistentLabel(g: Feature): { text: string; fontSize: number; offset: [number, number] } | null {
    const id = String(g.id);
    if (!fit) {
      const abbr = getStateByFips(id)?.abbr.toUpperCase();
      if (!abbr) return null;
      return { text: abbr, fontSize: stateLabelFontSize(g), offset: SMALL_STATE_LABEL_OFFSET[abbr] ?? [0, 0] };
    }
    if (!countyLabelIds?.has(id)) return null;
    const name = (g.properties as UsMapFeatureProps | undefined)?.name;
    return name ? { text: name, fontSize: 10, offset: [0, 0] } : null;
  }

  function clampZoom(z: number) {
    return Math.min(maxZoom, Math.max(minZoom, z));
  }

  function handleFeatureClick(id: string) {
    if (!zoomable) {
      onSelect(id);
      return;
    }
    // A double-tap arrives as two clicks in quick succession — the second
    // one lands here within DOUBLE_TAP_MS, so we swallow it (handled by
    // handleDoubleClick instead) rather than also selecting/navigating.
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    window.setTimeout(() => {
      if (lastTapRef.current === now) onSelect(id);
    }, DOUBLE_TAP_MS);
  }

  function handleDoubleClick() {
    if (!zoomable) return;
    lastTapRef.current = 0;
    setZoom((z) => (z > 1 ? 1 : clampZoom(4)));
  }

  const geographies = (
    <Geographies geography={geo}>
      {({ geographies, path }) => (
        <>
          {geographies.map((g) => {
            const id = String(g.id);
            return (
              <Geography
                key={g.rsmKey}
                geography={g}
                onClick={() => handleFeatureClick(id)}
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
          })}

          {geographies.map((g) => {
            const label = persistentLabel(g);
            if (!label) return null;
            const centroid = path.centroid(g);
            if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) return null;
            const [dx, dy] = label.offset;
            return (
              <text
                key={`label-${g.rsmKey}`}
                x={centroid[0] + dx}
                y={centroid[1] + dy}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: label.fontSize,
                  fontWeight: 700,
                  fill: "rgba(255,255,255,0.85)",
                  stroke: "rgba(5,6,7,0.65)",
                  strokeWidth: 2,
                  paintOrder: "stroke",
                  pointerEvents: "none",
                }}
              >
                {label.text}
              </text>
            );
          })}
        </>
      )}
    </Geographies>
  );

  const markerEls = markers.map((m) => (
    <Marker
      key={m.id}
      coordinates={[m.lng, m.lat]}
      onClick={onMarkerSelect ? () => onMarkerSelect(m.id) : undefined}
      onMouseEnter={onMarkerSelect ? () => setHoveredMarker(m.id) : undefined}
      onMouseLeave={onMarkerSelect ? () => setHoveredMarker((h) => (h === m.id ? null : h)) : undefined}
    >
      <MapPinMarker label={m.label} clickable={Boolean(onMarkerSelect)} hovered={hoveredMarker === m.id} />
    </Marker>
  ));

  return (
    <div className="relative w-full select-none" style={{ height, touchAction: zoomable ? "none" : undefined }} data-us-map>
      <ComposableMap
        projection={projection}
        width={width}
        height={height}
        style={{ width: "100%", height: "100%" }}
        onDoubleClick={handleDoubleClick}
      >
        {zoomable ? (
          <ZoomableGroup
            center={center}
            zoom={zoom}
            minZoom={minZoom}
            maxZoom={maxZoom}
            onMoveEnd={(pos) => {
              setCenter(pos.coordinates);
              setZoom(pos.zoom);
            }}
          >
            {geographies}
            {markerEls}
          </ZoomableGroup>
        ) : (
          <>
            {geographies}
            {markerEls}
          </>
        )}
      </ComposableMap>

      {zoomable && (
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z * 1.6))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-[rgba(5,6,7,0.85)] text-[16px] font-bold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z / 1.6))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-[rgba(5,6,7,0.85)] text-[16px] font-bold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setCenter([0, 0]);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-[rgba(5,6,7,0.85)] text-[11px] font-bold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
            aria-label="Reset zoom"
          >
            ⟲
          </button>
        </div>
      )}

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
