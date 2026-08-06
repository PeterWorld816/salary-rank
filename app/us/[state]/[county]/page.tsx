// This used to render the whole result in one page. The result flow is now
// a 3-step wizard under /us/result/** (see app/us/result/overall/page.tsx),
// so any old bookmarked/shared link here just forwards into it — preserving
// state/county as the new ?st=/?co= params instead of path segments.
import { notFound, redirect } from "next/navigation";
import { getStateByAbbr } from "@/data/us/stateMeta";
import { getUsCountiesGeoForState } from "@/lib/usGeo";
import { getAppLocale } from "@/lib/serverLocale";

function findCountyName(stateFips: string, countyFips: string): string | null {
  const geo = getUsCountiesGeoForState(stateFips);
  const feature = geo.features.find((f) => String(f.id) === countyFips);
  return (feature?.properties?.name as string | undefined) ?? null;
}

type RawSP = Record<string, string | string[] | undefined>;

export default function UsCountyPage({
  params,
  searchParams,
}: {
  params: { state: string; county: string };
  searchParams: RawSP;
}) {
  const state = getStateByAbbr(params.state);
  if (!state) notFound();

  const countyName = findCountyName(state.fips, params.county);
  if (!countyName) notFound();

  const base = getAppLocale() === "kr" ? "/kr" : "/us";
  const qs = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) => (v == null ? [] : [[k, Array.isArray(v) ? v[0] : v]]))
  );
  qs.set("st", params.state);
  qs.set("co", params.county);
  redirect(`${base}/result/overall?${qs.toString()}`);
}
