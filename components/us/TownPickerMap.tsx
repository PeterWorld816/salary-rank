"use client";
// County page's town-picker — the selected county's polygon (fit to just
// that one feature) with every town in it plotted as a marker (Gazetteer
// centroid, see scripts/fetchCensusData.ts). Tapping a marker navigates
// straight to that town's own SEO+result page
// (/us/[state]/[county]/[place]) — no intermediate list/confirm step, so
// the county page stays a single-tap-per-level drill-down like the state
// page's map above it.
import { useRouter } from "next/navigation";
import type { FeatureCollection, Geometry } from "geojson";
import { useLanguage } from "@/lib/LanguageProvider";
import { stripStateSuffix } from "@/lib/usFormat";
import UsMap, { type UsMapFeatureProps, type UsMapMarker } from "@/components/us/UsMap";

export type CountyMapPlace = {
  fips: string;
  name: string;
  medianHouseholdIncome: number | null;
  lat: number;
  lng: number;
};

// A single flat fill (not the min/max gradient states/counties use) — there's
// only ever one polygon on this map, so a choropleth scale has nothing to
// compare against.
const COUNTY_FILL = "rgba(52,211,153,0.16)";

export default function TownPickerMap({
  stateName,
  countyName,
  countyGeo,
  places,
  placeHrefBase,
}: {
  stateName: string;
  countyName: string;
  countyGeo: FeatureCollection<Geometry, UsMapFeatureProps>;
  places: CountyMapPlace[];
  // The county's own page path (e.g. "/us/CA/06037") — a picked place's
  // fips is appended as a path segment to reach its own page.
  placeHrefBase: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();

  const markers: UsMapMarker[] = places.map((p) => ({
    id: p.fips,
    lat: p.lat,
    lng: p.lng,
    label: stripStateSuffix(p.name, stateName),
  }));

  function handleSelect(placeFips: string) {
    router.push(`${placeHrefBase}/${placeFips}`);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-4">
      <UsMap
        geo={countyGeo}
        fit
        height={420}
        zoomable
        minZoom={1}
        maxZoom={6}
        onSelect={() => {}}
        onMarkerSelect={handleSelect}
        getFill={() => COUNTY_FILL}
        getLabel={() => countyName}
        markers={markers}
      />
      <p className="mt-2 text-center text-[11px] text-white/35">{t.usCountyMapPickHint}</p>
    </div>
  );
}
