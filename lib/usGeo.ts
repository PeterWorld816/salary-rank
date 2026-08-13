// Server-only topojson -> GeoJSON conversion. us-atlas ships the full US
// topology (states-10m.json, counties-10m.json — a few MB each); we only ever
// want to import those large files here, on the server, and hand client
// components an already-filtered plain GeoJSON FeatureCollection as props —
// never the raw topojson (see components/us/UsMap.tsx).
import "server-only";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import statesTopology from "us-atlas/states-10m.json";
import countiesTopology from "us-atlas/counties-10m.json";

export type UsGeoProps = { name: string };
export type UsFeatureCollection = FeatureCollection<Geometry, UsGeoProps>;

let statesGeoCache: UsFeatureCollection | null = null;
let countiesGeoCache: UsFeatureCollection | null = null;

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
