"use client";
// County page's town-picker — the selected county's polygon (fit to just
// that one feature) under the shared MapNavBar row, whose search box lists
// every town in it on demand. Picking a town, either from the search list or
// by tapping its pin directly on the map, shares one handler: it drops a
// single marker at that town's spot and navigates to its own SEO+result page
// (/us/[state]/[county]/[place]). No markers show until one is picked —
// that's what keeps the default map clean instead of showing every town in
// the county at once.
import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeatureCollection, Geometry } from "geojson";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatUsd, stripStateSuffix } from "@/lib/usFormat";
import UsMap, { type UsMapFeatureProps, type UsMapMarker } from "@/components/us/UsMap";
import MapNavBar, { type MapNavCrumb } from "@/components/us/MapNavBar";
import GeoCombobox from "@/components/us/GeoCombobox";

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

function TownPickerMapContent({
  stateName,
  countyName,
  countyGeo,
  places,
  placeHrefBase,
  crumbs,
  back,
}: {
  stateName: string;
  countyName: string;
  countyGeo: FeatureCollection<Geometry, UsMapFeatureProps>;
  places: CountyMapPlace[];
  // The county's own page path (e.g. "/us/CA/06037") — a picked place's
  // fips is appended as a path segment to reach its own page.
  placeHrefBase: string;
  crumbs: MapNavCrumb[];
  back: { label: string; href: string };
}) {
  const { t } = useLanguage();
  const router = useRouter();
  // Selecting a town (via the map's markers or the search list) shares this
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <MapNavBar crumbs={crumbs} back={back}>
        <GeoCombobox
          items={placeItems}
          onSelect={handleSelect}
          placeholder={t.usSearchPlacePlaceholder}
          emptyText={t.usListNoResults}
          selectedId={selectedFips ?? undefined}
        />
      </MapNavBar>
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

export default function TownPickerMap(props: {
  stateName: string;
  countyName: string;
  countyGeo: FeatureCollection<Geometry, UsMapFeatureProps>;
  places: CountyMapPlace[];
  placeHrefBase: string;
  crumbs: MapNavCrumb[];
  back: { label: string; href: string };
}) {
  return (
    <Suspense fallback={null}>
      <TownPickerMapContent {...props} />
    </Suspense>
  );
}
