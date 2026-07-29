import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStateByAbbr } from "@/data/us/stateMeta";
import { getUsCountiesGeoForState } from "@/lib/usGeo";
import UsStateClient from "./UsStateClient";

export function generateMetadata({ params }: { params: { state: string } }): Metadata {
  const state = getStateByAbbr(params.state);
  return { title: state ? `${state.name} — US Income Percentile` : "US Income Percentile" };
}

export default function UsStatePage({ params }: { params: { state: string } }) {
  const state = getStateByAbbr(params.state);
  if (!state) notFound();

  const geo = getUsCountiesGeoForState(state.fips);
  return <UsStateClient state={state} geo={geo} />;
}
