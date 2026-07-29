import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStateByAbbr } from "@/data/us/stateMeta";
import { getUsCountiesGeoForState } from "@/lib/usGeo";
import UsCountyClient from "./UsCountyClient";

function findCountyName(stateFips: string, countyFips: string): string | null {
  const geo = getUsCountiesGeoForState(stateFips);
  const feature = geo.features.find((f) => String(f.id) === countyFips);
  return (feature?.properties?.name as string | undefined) ?? null;
}

export function generateMetadata({ params }: { params: { state: string; county: string } }): Metadata {
  const state = getStateByAbbr(params.state);
  if (!state) return {};
  const countyName = findCountyName(state.fips, params.county);
  return { title: countyName ? `${countyName}, ${state.name} — US Income Percentile` : "US Income Percentile" };
}

export default function UsCountyPage({ params }: { params: { state: string; county: string } }) {
  const state = getStateByAbbr(params.state);
  if (!state) notFound();

  const countyName = findCountyName(state.fips, params.county);
  if (!countyName) notFound();

  return <UsCountyClient state={state} countyFips={params.county} countyName={countyName} />;
}
