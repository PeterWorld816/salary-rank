"use client";
// County SEO page's map+list widget — shows the selected county's polygon
// (fit to just that one feature) with the existing UsGeoList search list
// beside it. Picking a city from the list drops a pin at that place's
// Gazetteer centroid (see scripts/fetchCensusData.ts) via UsMap's `markers`
// prop, using the same projection the polygon itself is drawn with — no
// separate navigation happens until the visitor taps "view results".
import { useMemo, useState } from "react";
import Link from "next/link";
import type { FeatureCollection, Geometry } from "geojson";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
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

export default function CountyPlaceMap({
  stateName,
  countyName,
  countyGeo,
  places,
  calculatorHref,
}: {
  stateName: string;
  countyName: string;
  countyGeo: FeatureCollection<Geometry, UsMapFeatureProps>;
  places: CountyMapPlace[];
  // Base dashboard URL through "?st=...&co=..." — "&pl=<fips>" is appended
  // once a city is picked (same convention as PlaceSearchList's default
  // handler).
  calculatorHref: string;
}) {
  const { t } = useLanguage();
  const [selectedFips, setSelectedFips] = useState<string | null>(null);

  const placeItems = useMemo(
    () =>
      places
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({
          id: p.fips,
          name: stripStateSuffix(p.name, stateName),
          sub: p.medianHouseholdIncome != null ? formatUsd(p.medianHouseholdIncome) : undefined,
        })),
    [places, stateName]
  );

  const selectedPlace = selectedFips ? places.find((p) => p.fips === selectedFips) ?? null : null;

  const markers: UsMapMarker[] = selectedPlace
    ? [
        {
          id: selectedPlace.fips,
          lat: selectedPlace.lat,
          lng: selectedPlace.lng,
          label: stripStateSuffix(selectedPlace.name, stateName),
        },
      ]
    : [];

  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start">
      <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-4">
        <UsMap
          geo={countyGeo}
          fit
          height={340}
          onSelect={() => {}}
          getFill={() => COUNTY_FILL}
          getLabel={() => countyName}
          markers={markers}
        />
        <p className="mt-2 text-center text-[11px] text-white/35">{t.usCountyMapPickHint}</p>
      </div>

      <div className="w-full flex-shrink-0 md:w-72">
        <UsGeoList
          items={placeItems}
          onSelect={setSelectedFips}
          searchPlaceholder={t.usSearchPlacePlaceholder}
          emptyText={t.usListNoResults}
          maxHeight={340}
          selectedId={selectedFips ?? undefined}
        />
        {selectedPlace && (
          <Link
            href={`${calculatorHref}&pl=${selectedPlace.fips}`}
            className="mt-3 flex w-full items-center justify-center rounded-md bg-[#34D399] px-4 py-2.5 text-center text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
          >
            {formatTemplate(t.usCountyViewResultsForPlaceTemplate, {
              place: stripStateSuffix(selectedPlace.name, stateName),
            })}
          </Link>
        )}
      </div>
    </div>
  );
}
