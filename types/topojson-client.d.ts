// Minimal ambient typing for topojson-client — the official @types package
// depends on the now-unpublished "topojson-specification" package, so we
// declare just the one function this app actually uses (topology -> GeoJSON).
declare module "topojson-client" {
  import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";

  export function feature(
    topology: any,
    object: any
  ): FeatureCollection<Geometry, GeoJsonProperties>;

  // Takes an array of TopoJSON geometry objects (e.g. a GeometryCollection's
  // .geometries, each with .arcs) and returns, per input index, the indexes
  // of geometries that share at least one arc — i.e. true shared-border
  // adjacency, not distance/centroid based.
  export function neighbors(objects: any[]): number[][];
}
