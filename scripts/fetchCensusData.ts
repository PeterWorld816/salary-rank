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
// Source: US Census Bureau, ACS 2022 5-Year Estimates
//   B19013 = median household income (one value per geography)
//   B19001 = household income distributed across 16 fixed brackets, used to
//            build a real "top X% needs $Y" percentile curve per geography
//            instead of estimating one from the median alone.
import { config } from "dotenv";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

for (const file of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), file);
  if (existsSync(p)) config({ path: p });
}

const CENSUS_API_KEY = process.env.CENSUS_API_KEY;
const ACS_BASE = "https://api.census.gov/data/2022/acs/acs5";

// B19001 bracket lower bounds, for brackets 2..16 (bracket 1 is "< $10,000",
// which has no useful lower bound as a percentile anchor). Bracket 16 is the
// open-ended "$200,000 or more" — its lower bound doubles as the threshold
// for whatever top-percent that bracket represents at each geography.
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

async function censusGet(params: Record<string, string>): Promise<string[][]> {
  const url = new URL(ACS_BASE);
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

function parseCounts(record: Record<string, string>): number[] {
  return [Number(record.B19001_001E), ...B19001_VARS.map((v) => Number(record[v]))];
}

const GET_VARS = ["NAME", "B19013_001E", "B19001_001E", ...B19001_VARS].join(",");

async function fetchNational() {
  const rows = await censusGet({ get: GET_VARS, for: "us:*" });
  const [record] = rowsToRecords(rows);
  return {
    medianHouseholdIncome: parseMedian(record.B19013_001E),
    percentileAnchors: buildIncomeAnchors(parseCounts(record)),
  };
}

async function fetchStates() {
  const rows = await censusGet({ get: GET_VARS, for: "state:*" });
  return rowsToRecords(rows).map((record) => ({
    fips: record.state,
    name: record.NAME,
    medianHouseholdIncome: parseMedian(record.B19013_001E),
    percentileAnchors: buildIncomeAnchors(parseCounts(record)),
  }));
}

async function fetchCountiesForState(stateFips: string) {
  const rows = await censusGet({ get: GET_VARS, for: "county:*", in: `state:${stateFips}` });
  return rowsToRecords(rows).map((record) => ({
    fips: `${record.state}${record.county}`,
    stateFips: record.state,
    name: record.NAME,
    medianHouseholdIncome: parseMedian(record.B19013_001E),
    percentileAnchors: buildIncomeAnchors(parseCounts(record)),
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

  console.log("Fetching national income distribution...");
  const national = await fetchNational();
  writeJson("data/us/nationalIncome.json", {
    meta: {
      source: "US Census Bureau, ACS 2022 5-Year Estimates, tables B19013 & B19001",
      unit: "USD",
      year: 2022,
      generatedAt: new Date().toISOString(),
    },
    ...national,
  });

  console.log("Fetching state-level income...");
  const states = await fetchStates();
  writeJson("data/us/stateIncome.json", {
    meta: {
      source: "US Census Bureau, ACS 2022 5-Year Estimates, tables B19013 & B19001",
      unit: "USD",
      year: 2022,
      generatedAt: new Date().toISOString(),
    },
    states,
  });

  console.log(`Fetching county-level income for ${states.length} states (one request per state)...`);
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

  writeJson("data/us/countyIncome.json", {
    meta: {
      source: "US Census Bureau, ACS 2022 5-Year Estimates, tables B19013 & B19001",
      unit: "USD",
      year: 2022,
      generatedAt: new Date().toISOString(),
    },
    counties,
  });

  console.log(`Done. ${states.length} states, ${counties.length} counties.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
