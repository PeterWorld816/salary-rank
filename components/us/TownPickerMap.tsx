"use client";
// County page's town-picker — the selected county's polygon (fit to just
// that one feature) alongside an always-visible, searchable list of every
// town in it. Picking a town, either from the list or by tapping its pin
// directly on the map, shares one handler: it drops a single marker at that
// town's spot and navigates to its own SEO+result page
// (/us/[state]/[county]/[place]). No markers show until one is picked —
// that's what keeps the default map clean instead of showing every town in
// the county at once.
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FeatureCollection, Geometry } from "geojson";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatUsd, stripStateSuffix } from "@/lib/usFormat";
import UsMap, { type UsMapFeatureProps, type UsMapMarker } from "@/components/us/UsMap";
import UsGeoList from "@/components/us/UsGeoList";

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
  // Selecting a town (via the map's markers or the list below) shares this
  // single handler, so the two stay in sync by construction. No marker is
  // shown until one is picked — see `markers` below.
  const [selectedFips, setSelectedFips] = useState<string | null>(null);

  function handleSelect(placeFips: string) {
    setSelectedFips(placeFips);
    router.push(`${placeHrefBase}/${placeFips}`);
  }

  const markers: UsMapMarker[] = places
    .filter((p) => p.fips === selectedFips)
    .map((p) => ({
      id: p.fips,
      lat: p.lat,
      lng: p.lng,
      label: stripStateSuffix(p.name, stateName),
    }));

  const placeItems = places.map((p) => ({
    id: p.fips,
    name: stripStateSuffix(p.name, stateName),
    sub: p.medianHouseholdIncome != null ? formatUsd(p.medianHouseholdIncome) : undefined,
  }));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
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

        <div className="w-full shrink-0 sm:w-64">
          <UsGeoList
            items={placeItems}
            onSelect={handleSelect}
            searchPlaceholder={t.usSearchPlacePlaceholder}
            emptyText={t.usListNoResults}
            selectedId={selectedFips ?? undefined}
            maxHeight={420}
          />
        </div>
      </div>
    </div>
  );
}
