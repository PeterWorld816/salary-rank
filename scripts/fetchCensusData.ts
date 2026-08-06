// One-shot build-time data pipeline for the /us section. Run manually with
// `npm run fetch:census` whenever the underlying ACS release changes — the
// app itself never calls the Census API at runtime, it only ever reads the
// data/us/*.json files this script writes.
//
// Requires a free Census API key (https://api.census.gov/data/key_signup.html)
// in CENSUS_API_KEY (.env.local) — as of 2026 the API hard-rejects unkeyed
// requests (responds 302 -> missing_key.html with an X-DataWebAPI-KeyError
// header) rather than just rate-limiting them, so there's no useful "no key"
// fallback path anymore.
//
// Source: US Census Bureau, American Community Survey
//   B19013 = median household income (one value per geography)
//   B19001 = household income distributed across 16 fixed brackets, used to
//            build a real "top X% needs $Y" percentile curve per geography
//            instead of estimating one from the median alone.
//   B20017 = median earnings in the past 12 months by sex, for the population
//            16+ with earnings (individual earnings, not household income —
//            _002E is male, _005E is female; verified against the live
//            groups/B20017.json shell 2026-08).
//   B19126 = median family income by family type — _002E is the
//            married-couple family figure, used as the "married" reference.
//   B19215 = median NONFAMILY household income by sex of householder —
//            _001E is the all-householders total, used as the "single"
//            reference. (The spec named B19216 as the alternative, but that
//            table turned out to be an *aggregate*-income table, not
//            median, and no ACS table cross-tabulates "married vs.
//            nonfamily" directly — B19126 + B19215's totals are the closest
//            real median-income tables to that split.)
// None of these breakdowns exist below the state/county level, and small
// counties routinely fail to publish them at all — ACS represents that with
// the sentinel -666666666, which parseReliableMedian below turns into null
// rather than a guess. A large margin of error (>= the estimate itself) is
// treated the same way: too unreliable to show as someone's "reference".
//
// Vintages: county geographies are too small a population to appear in the
// 1-year release, so counties only ever get the 5-year (multi-year average)
// numbers. States (and the nation) are big enough for both, so they get the
// 5-year AND the latest 1-year (single most recent year) side by side.
//
// ACS5_YEAR/ACS1_YEAR below were picked by probing api.census.gov/data/{year}
// for each candidate year and taking the newest one that returned real data
// instead of a 404 (checked 2026-07-30: 2025 wasn't published yet for either
// dataset, 2024 was the latest valid vintage for both acs5 and acs1). Bump
// these — and re-run `npm run fetch:census` — once a newer vintage ships.
const ACS5_YEAR = 2024; // covers the 5-year period ACS5_YEAR-4 .. ACS5_YEAR
const ACS1_YEAR = 2024; // single most recent year
const ACS5_BASE = `https://api.census.gov/data/${ACS5_YEAR}/acs/acs5`;
const ACS1_BASE = `https://api.census.gov/data/${ACS1_YEAR}/acs/acs1`;
const ACS5_YEAR_RANGE = `${ACS5_YEAR - 4}-${ACS5_YEAR}`;

import { config } from "dotenv";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

for (const file of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), file);
  if (existsSync(p)) config({ path: p });
}

const CENSUS_API_KEY = process.env.CENSUS_API_KEY;

// B19001 bracket lower bounds, for brackets 2..16 (bracket 1 is "< $10,000",
// which has no useful lower bound as a percentile anchor). Bracket 16 is the
// open-ended "$200,000 or more" — its lower bound doubles as the threshold
// for whatever top-percent that bracket represents at each geography. These
// bracket boundaries are fixed nominal-dollar cutoffs baked into the table
// definition itself, not adjusted per release, so they don't change by year.
const B19001_LOWER_BOUNDS = [
  10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000, 60000, 75000, 100000, 125000, 150000, 200000,
];
const B19001_VARS = Array.from({ length: 16 }, (_, i) => `B19001_${String(i + 2).padStart(3, "0")}E`);

type PercentileAnchor = { topPercent: number; value: number };

function buildIncomeAnchors(counts: number[]): PercentileAnchor[] {
  // counts = [total, bracket1..bracket16], same order as B19001_001E..017E
  const total = counts[0];
  if (!Number.isFinite(total) || total <= 0) return [];

  const anchors: PercentileAnchor[] = [];
  for (let k = 16; k >= 2; k--) {
    let cumTop = 0;
    for (let j = k; j <= 16; j++) cumTop += counts[j] ?? 0;
    const topPercent = (cumTop / total) * 100;
    if (topPercent > 0 && topPercent < 100) {
      anchors.push({ topPercent: Math.min(99.5, topPercent), value: B19001_LOWER_BOUNDS[k - 2] });
    }
  }
  anchors.push({ topPercent: 100, value: 1 }); // floor anchor, matches data/salary.json convention
  return anchors.sort((a, b) => a.topPercent - b.topPercent);
}

async function censusGet(base: string, params: Record<string, string>): Promise<string[][]> {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (CENSUS_API_KEY) url.searchParams.set("key", CENSUS_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Census API ${res.status} for ${url.toString()}\n${body.slice(0, 300)}`);
  }
  return res.json();
}

function rowsToRecords(rows: string[][]): Record<string, string>[] {
  const [header, ...data] = rows;
  return data.map((row) => Object.fromEntries(header.map((h, i) => [h, row[i]])));
}

function parseMedian(raw: string | undefined): number | null {
  const n = Number(raw);
  // ACS uses large negative sentinels (e.g. -666666666) for "not computed".
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Same as parseMedian, but also nulls out estimates whose 90%-confidence
// margin of error is at least as large as the estimate itself — the
// standard rule of thumb for "this number could plausibly be anything,
// including zero" on small-population ACS breakouts.
function parseReliableMedian(estimateRaw: string | undefined, moeRaw: string | undefined): number | null {
  const value = parseMedian(estimateRaw);
  if (value == null) return null;
  const moe = Number(moeRaw);
  if (Number.isFinite(moe) && moe >= value) return null;
  return value;
}

function parseCounts(record: Record<string, string>): number[] {
  return [Number(record.B19001_001E), ...B19001_VARS.map((v) => Number(record[v]))];
}

// Sex (B20017) and household-type (B19126/B19215) median income/earnings —
// see the file-header comment for exactly which variable is which and why.
const GENDER_MARITAL_VARS = ["B20017_002E", "B20017_002M", "B20017_005E", "B20017_005M", "B19126_002E", "B19126_002M", "B19215_001E", "B19215_001M"];

function parseByGenderAndMaritalStatus(record: Record<string, string>) {
  return {
    byGender: {
      male: parseReliableMedian(record.B20017_002E, record.B20017_002M),
      female: parseReliableMedian(record.B20017_005E, record.B20017_005M),
    },
    byMaritalStatus: {
      married: parseReliableMedian(record.B19126_002E, record.B19126_002M),
      single: parseReliableMedian(record.B19215_001E, record.B19215_001M),
    },
  };
}

const GET_VARS = ["NAME", "B19013_001E", "B19001_001E", ...B19001_VARS, ...GENDER_MARITAL_VARS].join(",");

async function fetchNational() {
  const rows = await censusGet(ACS5_BASE, { get: GET_VARS, for: "us:*" });
  const [record] = rowsToRecords(rows);
  return {
    medianHouseholdIncome: parseMedian(record.B19013_001E),
    percentileAnchors: buildIncomeAnchors(parseCounts(record)),
  };
}

async function fetchStates() {
  const rows = await censusGet(ACS5_BASE, { get: GET_VARS, for: "state:*" });
  return rowsToRecords(rows).map((record) => ({
    fips: record.state,
    name: record.NAME,
    medianHouseholdIncome: parseMedian(record.B19013_001E),
    percentileAnchors: buildIncomeAnchors(parseCounts(record)),
    ...parseByGenderAndMaritalStatus(record),
  }));
}

// States (and DC) all clear the ACS 1-year population threshold (65,000), so
// unlike counties every state we care about should show up here.
async function fetchStates1Year() {
  const rows = await censusGet(ACS1_BASE, { get: GET_VARS, for: "state:*" });
  return rowsToRecords(rows).map((record) => ({
    fips: record.state,
    medianHouseholdIncome: parseMedian(record.B19013_001E),
    percentileAnchors: buildIncomeAnchors(parseCounts(record)),
  }));
}

async function fetchCountiesForState(stateFips: string) {
  const rows = await censusGet(ACS5_BASE, { get: GET_VARS, for: "county:*", in: `state:${stateFips}` });
  return rowsToRecords(rows).map((record) => ({
    fips: `${record.state}${record.county}`,
    stateFips: record.state,
    name: record.NAME,
    medianHouseholdIncome: parseMedian(record.B19013_001E),
    percentileAnchors: buildIncomeAnchors(parseCounts(record)),
    ...parseByGenderAndMaritalStatus(record),
  }));
}

function writeJson(relPath: string, data: unknown) {
  const abs = path.resolve(process.cwd(), relPath);
  writeFileSync(abs, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`wrote ${relPath}`);
}

async function main() {
  if (!CENSUS_API_KEY) {
    console.error(
      "CENSUS_API_KEY is not set. As of 2026 api.census.gov rejects unkeyed requests outright " +
        "(missing_key.html), so this script can't run without one.\n" +
        "Get a free key at https://api.census.gov/data/key_signup.html and put it in .env.local as " +
        "CENSUS_API_KEY=... — data/us/*.json are left untouched (still placeholders)."
    );
    process.exitCode = 1;
    return;
  }

  const commonMeta = {
    source: `US Census Bureau, ACS ${ACS5_YEAR_RANGE} 5-Year Estimates, tables B19013, B19001, B19126, B19215 & B20017`,
    unit: "USD" as const,
    acs5Vintage: ACS5_YEAR,
    acs5YearRange: ACS5_YEAR_RANGE,
    generatedAt: new Date().toISOString(),
  };

  console.log(`Fetching national income distribution (ACS5 ${ACS5_YEAR_RANGE})...`);
  const national = await fetchNational();
  writeJson("data/us/nationalIncome.json", { meta: commonMeta, ...national });

  console.log(`Fetching state-level income (ACS5 ${ACS5_YEAR_RANGE})...`);
  const states = await fetchStates();

  console.log(`Fetching state-level income (ACS1 ${ACS1_YEAR}, latest single year)...`);
  const states1Year = await fetchStates1Year();
  const states1YearByFips = new Map(states1Year.map((s) => [s.fips, s]));

  const statesWithLatest1Year = states.map((state) => {
    const latest = states1YearByFips.get(state.fips);
    return {
      ...state,
      latest1Year: latest
        ? { year: ACS1_YEAR, medianHouseholdIncome: latest.medianHouseholdIncome, percentileAnchors: latest.percentileAnchors }
        : null,
    };
  });

  writeJson("data/us/stateIncome.json", {
    meta: {
      ...commonMeta,
      source: `US Census Bureau, ACS 5-Year (${ACS5_YEAR_RANGE}) & 1-Year (${ACS1_YEAR}) Estimates, tables B19013, B19001, B19126, B19215 & B20017`,
      acs1Vintage: ACS1_YEAR,
    },
    states: statesWithLatest1Year,
  });

  console.log(`Fetching county-level income (ACS5 ${ACS5_YEAR_RANGE}) for ${states.length} states (one request per state)...`);
  const counties = [];
  for (const state of states) {
    if (state.fips === "72" /* Puerto Rico, not in our 50+DC map */) continue;
    try {
      const stateCounties = await fetchCountiesForState(state.fips);
      counties.push(...stateCounties);
      console.log(`  ${state.name}: ${stateCounties.length} counties`);
    } catch (err) {
      console.error(`  ${state.name}: failed — ${(err as Error).message}`);
    }
    // Be polite to the API even though a keyed request has a generous quota.
    await new Promise((r) => setTimeout(r, 150));
  }

  writeJson("data/us/countyIncome.json", { meta: commonMeta, counties });

  const pct = (n: number) => `${((n / counties.length) * 100).toFixed(1)}%`;
  const withMale = counties.filter((c) => c.byGender.male != null).length;
  const withFemale = counties.filter((c) => c.byGender.female != null).length;
  const withMarried = counties.filter((c) => c.byMaritalStatus.married != null).length;
  const withSingle = counties.filter((c) => c.byMaritalStatus.single != null).length;
  const withBothGender = counties.filter((c) => c.byGender.male != null && c.byGender.female != null).length;
  const withBothMarital = counties.filter((c) => c.byMaritalStatus.married != null && c.byMaritalStatus.single != null).length;
  console.log(`\nCounty-level breakdown coverage (of ${counties.length} counties):`);
  console.log(`  byGender.male:          ${withMale} (${pct(withMale)})`);
  console.log(`  byGender.female:        ${withFemale} (${pct(withFemale)})`);
  console.log(`  byGender (both):        ${withBothGender} (${pct(withBothGender)})`);
  console.log(`  byMaritalStatus.married:${withMarried} (${pct(withMarried)})`);
  console.log(`  byMaritalStatus.single: ${withSingle} (${pct(withSingle)})`);
  console.log(`  byMaritalStatus (both): ${withBothMarital} (${pct(withBothMarital)})`);

  console.log(`\nDone. ${states.length} states, ${counties.length} counties.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
