import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStateByAbbr } from "@/data/us/stateMeta";
import { getUsCountiesGeoForState } from "@/lib/usGeo";
import { getAppLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata, siteTitle, siteDescription } from "@/lib/seo";
import UsStateClient from "./UsStateClient";

export function generateMetadata({ params }: { params: { state: string } }): Metadata {
  const locale = getAppLocale();
  const state = getStateByAbbr(params.state);
  const title = state ? `${state.name} — ${siteTitle(locale)}` : siteTitle(locale);
  return pageMetadata(locale, getOriginalPathname(), title, siteDescription(locale));
}

export default function UsStatePage({ params }: { params: { state: string } }) {
  const state = getStateByAbbr(params.state);
  if (!state) notFound();

  const geo = getUsCountiesGeoForState(state.fips);
  return <UsStateClient state={state} geo={geo} />;
}
