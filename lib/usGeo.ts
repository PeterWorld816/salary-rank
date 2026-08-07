// Server-only topojson -> GeoJSON conversion. us-atlas ships the full US
// topology (states-10m.json, counties-10m.json — a few MB each); we only ever
// want to import those large files here, on the server, and hand client
// components an already-filtered plain GeoJSON FeatureCollection as props —
// never the raw topojson (see components/us/UsMap.tsx).
import "server-only";
import { feature, neighbors } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import statesTopology from "us-atlas/states-10m.json";
import countiesTopology from "us-atlas/counties-10m.json";

export type UsGeoProps = { name: string };
export type UsFeatureCollection = FeatureCollection<Geometry, UsGeoProps>;

let statesGeoCache: UsFeatureCollection | null = null;
let countiesGeoCache: UsFeatureCollection | null = null;
let countyNeighborsCache: Map<string, string[]> | null = null;

export function getUsStatesGeo(): UsFeatureCollection {
  if (!statesGeoCache) {
    statesGeoCache = feature(statesTopology, (statesTopology as any).objects.states) as UsFeatureCollection;
  }
  return statesGeoCache;
}

export function getUsCountiesGeoForState(stateFips: string): UsFeatureCollection {
  if (!countiesGeoCache) {
    countiesGeoCache = feature(countiesTopology, (countiesTopology as any).objects.counties) as UsFeatureCollection;
  }
  return {
    type: "FeatureCollection",
    features: countiesGeoCache.features.filter((f) => String(f.id).slice(0, 2) === stateFips),
  };
}

// county fips -> fips of counties sharing a border (topojson-client's
// `neighbors`, derived from shared arcs in the raw topology — true
// geographic adjacency, not a centroid/distance approximation). Built once
// and cached; the whole-country adjacency graph is cheap relative to the
// topology parse we're already paying for above.
function getCountyNeighborsMap(): Map<string, string[]> {
  if (!countyNeighborsCache) {
    const geometries = (countiesTopology as any).objects.counties.geometries as { id: string }[];
    const neighborIndexes = neighbors(geometries);
    const map = new Map<string, string[]>();
    geometries.forEach((g, i) => {
      map.set(String(g.id), neighborIndexes[i].map((j) => String(geometries[j].id)));
    });
    countyNeighborsCache = map;
  }
  return countyNeighborsCache;
}

// Up to `limit` counties in the same state that share a border with
// `countyFips`. Islands and single-county states (e.g. DC) can have no
// shared-border neighbors at all, or fewer than `limit` in-state ones — in
// that case this pads out with other same-state counties (alphabetically)
// rather than reaching across a state line and calling it "adjacent".
export function getAdjacentCountyFips(countyFips: string, limit = 5): string[] {
  const stateFips = countyFips.slice(0, 2);
  const trueNeighbors = (getCountyNeighborsMap().get(countyFips) ?? []).filter((f) => f.slice(0, 2) === stateFips);

  const result = trueNeighbors.slice(0, limit);
  if (result.length >= limit) return result;

  const seen = new Set([countyFips, ...result]);
  const padding = getUsCountiesGeoForState(stateFips)
    .features.filter((f) => !seen.has(String(f.id)))
    .sort((a, b) => (a.properties?.name ?? "").localeCompare(b.properties?.name ?? ""))
    .map((f) => String(f.id));

  return [...result, ...padding.slice(0, limit - result.length)];
}
