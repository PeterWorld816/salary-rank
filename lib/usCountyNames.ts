// Client-safe fips -> county name lookup, for the one place a client
// component needs an arbitrary county's name without the rest of its data:
// PersonalizedResult's "friend challenge" banner decodes a shared compare
// link's countyFips (which may be a *different* county than the one the
// current page is about) and just needs a name to render "you out-earn 62%
// of people in Bergen County, New Jersey" — nothing else.
//
// Backed by data/us/countyNames.json, a {fips, name}-only slice of
// countyIncome.json (~160KB vs. that file's ~5.3MB — see
// lib/usCountyPlaceData.ts for why the full dataset must stay server-only).
// Regenerate it whenever countyIncome.json changes:
//   node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('data/us/countyIncome.json','utf8'));fs.writeFileSync('data/us/countyNames.json',JSON.stringify({counties:d.counties.map(c=>({fips:c.fips,name:c.name}))}))"
import countyNamesData from "@/data/us/countyNames.json";

const nameByFips = new Map<string, string>(countyNamesData.counties.map((c) => [c.fips, c.name]));

export function getCountyName(countyFips: string): string | null {
  return nameByFips.get(countyFips) ?? null;
}
