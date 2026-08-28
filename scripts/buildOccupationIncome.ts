// One-shot build-time pipeline for the occupation-based income percentile
// feature — reads the raw ACS 5-Year PUMS person-record file (national
// combined file, one row per surveyed person) and computes PWGTP-weighted
// earnings percentile curves per (state x occupation major-group x age band
// x sex), plus a national curve per (occupation x age band x sex) used as
// the small-sample fallback.
//
// Unlike scripts/fetchCensusData.ts (which reads pre-aggregated ACS summary
// tables via the Census API), this reads the actual PUMS microdata file
// directly off disk — no API key involved. Run manually:
//   npx tsx scripts/buildOccupationIncome.ts <path-to-psam_pus.csv>
//
// Data source: https://www2.census.gov/programs-surveys/acs/data/pums/2024/5-Year/csv_pus.zip
// (2020-2024 5-Year ACS PUMS, the same vintage already used throughout
// data/us/*.json). That zip contains one national person-record CSV
// (psam_pus.csv, ~10GB uncompressed) with a STATE column — a single combined
// download instead of 51 separate per-state files, and it doubles as the
// exact source for the national fallback curve in the same pass.
//
// Income definition: PERNP (total person's earnings — wages/salary +
// self-employment), adjusted to constant 2024 dollars via ADJINC (PUMS
// 5-year files mix five survey years' nominal dollars; ADJINC/1e6 is the
// official multiplier documented in the OCCP/PERNP variable notes of
// PUMS_Data_Dictionary_2020-2024). This is a deliberate departure from the
// rest of /us's income figures (which are all *household* income from ACS
// summary tables, e.g. B19001/B19013) — occupation is a personal attribute,
// a household doesn't have one, so a personal-earnings variable is the only
// one that makes sense here. Only PERNP > 0 records count (log-log
// percentile interpolation requires positive values, and someone reporting
// an occupation with zero/negative earnings — e.g. a self-employed loss
// year — isn't representative of "what this job pays" anyway).
//
// Only ages 25-99 are bucketed (matches the age bands used elsewhere in
// /us), and only SEX 1/2 (PUMS has no third category). Military Specific
// Occupations (soc 55-0000) are excluded — see data/us/occupationCategories.json's
// meta.note.
import fs from "node:fs";
import readline from "node:readline";
import path from "node:path";
import occupationCategoriesData from "../data/us/occupationCategories.json";
import { US_STATES } from "../data/us/stateMeta";
import type { PercentileAnchor } from "../lib/percentileTable";

const AGE_BANDS: { id: string; lo: number; hi: number }[] = [
  { id: "25-34", lo: 25, hi: 34 },
  { id: "35-44", lo: 35, hi: 44 },
  { id: "45-54", lo: 45, hi: 54 },
  { id: "55-64", lo: 55, hi: 64 },
  { id: "65-99", lo: 65, hi: 99 },
];

const CATEGORIES = occupationCategoriesData.categories
  .filter((c) => c.selectable !== false)
  .map((c) => ({ id: c.id, occpRange: c.occpRange as [number, number] }));

// Weighted-percentile resolution: fine enough near both tails (this site's
// whole pitch is "top X%") without storing a point per integer percentile.
// Same {topPercent, value}[] shape as every other percentileAnchors table in
// this app (lib/percentileTable.ts), so the existing log-log interpolation
// helpers work on this data completely unchanged.
const TOP_PERCENT_POINTS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99];
const MIN_RAW_COUNT_FOR_OWN_DATA = 100;

function occCategoryId(occp: string): string | null {
  if (!occp) return null;
  const n = Number(occp);
  if (!Number.isFinite(n)) return null;
  for (const c of CATEGORIES) {
    if (n >= c.occpRange[0] && n <= c.occpRange[1]) return c.id;
  }
  return null;
}

function ageBandId(agep: string): string | null {
  const n = Number(agep);
  if (!Number.isFinite(n)) return null;
  for (const b of AGE_BANDS) {
    if (n >= b.lo && n <= b.hi) return b.id;
  }
  return null;
}

type Bucket = { values: number[]; weights: number[] };
function newBucket(): Bucket {
  return { values: [], weights: [] };
}

function weightedPercentileAnchors(bucket: Bucket): PercentileAnchor[] {
  const n = bucket.values.length;
  const idx = Array.from({ length: n }, (_, i) => i);
  idx.sort((a, b) => bucket.values[b] - bucket.values[a]); // descending by value
  const v = idx.map((i) => bucket.values[i]);
  const w = idx.map((i) => bucket.weights[i]);
  const totalWeight = w.reduce((a, b) => a + b, 0);

  function valueAtTopFraction(topFraction: number): number {
    const target = topFraction * totalWeight;
    let cumBefore = 0;
    for (let i = 0; i < n; i++) {
      const cumAfter = cumBefore + w[i];
      if (cumAfter >= target || i === n - 1) {
        if (i === 0) return v[0];
        const t = w[i] > 0 ? (target - cumBefore) / w[i] : 0;
        return v[i - 1] + (v[i] - v[i - 1]) * t;
      }
      cumBefore = cumAfter;
    }
    return v[n - 1];
  }

  const rawAnchors: PercentileAnchor[] = TOP_PERCENT_POINTS.map((p) => ({
    topPercent: p,
    value: Math.round(valueAtTopFraction(p / 100)),
  }));
  // lib/percentileTable.ts's log-log interpolation divides by
  // (log(a.value) - log(b.value)) between adjacent anchors — two adjacent
  // points landing on the exact same rounded dollar value (plausible in a
  // thin bucket right at the 100-record fallback threshold, where several
  // 5%-apart quantiles can collapse onto one clustered salary) would divide
  // by zero. Ascending by topPercent already; drop a point whenever it
  // repeats the value already kept, so every anchor pair stays strictly
  // decreasing in value.
  const anchors: PercentileAnchor[] = [];
  for (const a of rawAnchors) {
    if (anchors.length === 0 || anchors[anchors.length - 1].value !== a.value) anchors.push(a);
  }
  // Floor sentinel, same convention buildIncomeAnchors (scripts/fetchCensusData.ts)
  // already uses for every other percentileAnchors table in this app.
  anchors.push({ topPercent: 100, value: 1 });
  return anchors;
}

async function main() {
  // The national PUMS zip splits the person file into 4 parts
  // (psam_pusa/b/c/d.csv, ~10.5GB uncombined) — accept one or more paths,
  // all sharing the same header/column layout, and stream them in sequence
  // into the same bucket maps (so a combo split across parts still
  // aggregates correctly; STATE is what actually partitions the data, not
  // the file split, which is arbitrary).
  const csvPaths = process.argv.slice(2);
  if (csvPaths.length === 0) {
    console.error("Usage: npx tsx scripts/buildOccupationIncome.ts <path-to-psam_pus*.csv> [more paths...]");
    process.exit(1);
  }
  for (const p of csvPaths) {
    if (!fs.existsSync(p)) {
      console.error(`FAILED: file not found at ${p}`);
      process.exit(1);
    }
  }

  const t0 = Date.now();

  const stateBuckets = new Map<string, Bucket>(); // key: `${stateFips}|${occId}|${ageBand}|${sex}`
  const nationalBuckets = new Map<string, Bucket>(); // key: `${occId}|${ageBand}|${sex}`

  function getBucket(map: Map<string, Bucket>, key: string): Bucket {
    let b = map.get(key);
    if (!b) {
      b = newBucket();
      map.set(key, b);
    }
    return b;
  }

  let totalRows = 0;
  let qualifyingRows = 0;
  const stateFipsSeen = new Set<string>();

  for (const csvPath of csvPaths) {
    console.log(`Streaming ${csvPath} ...`);
    const rl = readline.createInterface({
      input: fs.createReadStream(csvPath, { encoding: "utf8", highWaterMark: 1 << 20 }),
      crlfDelay: Infinity,
    });

    let idxSTATE = -1,
      idxADJINC = -1,
      idxPWGTP = -1,
      idxAGEP = -1,
      idxSEX = -1,
      idxOCCP = -1,
      idxPERNP = -1;

    let lineNo = 0;

    for await (const line of rl) {
      lineNo++;
      if (lineNo === 1) {
        const header = line.split(",");
        idxSTATE = header.indexOf("STATE");
        idxADJINC = header.indexOf("ADJINC");
        idxPWGTP = header.indexOf("PWGTP");
        idxAGEP = header.indexOf("AGEP");
        idxSEX = header.indexOf("SEX");
        idxOCCP = header.indexOf("OCCP");
        idxPERNP = header.indexOf("PERNP");
        const missing = Object.entries({ idxSTATE, idxADJINC, idxPWGTP, idxAGEP, idxSEX, idxOCCP, idxPERNP }).filter(
          ([, v]) => v < 0
        );
        if (missing.length) {
          console.error(`FAILED: missing expected columns in ${csvPath}:`, missing.map(([k]) => k).join(", "));
          process.exit(1);
        }
        continue;
      }
      if (!line) continue;
      totalRows++;
      if (totalRows % 2_000_000 === 0) {
        console.log(`  ...${(totalRows / 1_000_000).toFixed(1)}M rows read, ${qualifyingRows.toLocaleString()} qualifying so far (${((Date.now() - t0) / 1000).toFixed(0)}s elapsed)`);
      }

      const f = line.split(",");
      const stateFips = f[idxSTATE];
      const occId = occCategoryId(f[idxOCCP]);
      if (!occId) continue;
      const ab = ageBandId(f[idxAGEP]);
      if (!ab) continue;
      const sex = f[idxSEX];
      if (sex !== "1" && sex !== "2") continue;
      const pernpRaw = Number(f[idxPERNP]);
      if (!Number.isFinite(pernpRaw) || pernpRaw <= 0) continue;
      const adjinc = Number(f[idxADJINC]);
      if (!Number.isFinite(adjinc) || adjinc <= 0) continue;
      const weight = Number(f[idxPWGTP]);
      if (!Number.isFinite(weight) || weight <= 0) continue;

      const adjustedIncome = pernpRaw * (adjinc / 1_000_000);

      stateFipsSeen.add(stateFips);
      qualifyingRows++;

      const stateBucket = getBucket(stateBuckets, `${stateFips}|${occId}|${ab}|${sex}`);
      stateBucket.values.push(adjustedIncome);
      stateBucket.weights.push(weight);

      const nationalBucket = getBucket(nationalBuckets, `${occId}|${ab}|${sex}`);
      nationalBucket.values.push(adjustedIncome);
      nationalBucket.weights.push(weight);
    }
  }

  console.log(
    `Done streaming ${csvPaths.length} file(s): ${totalRows.toLocaleString()} total rows, ${qualifyingRows.toLocaleString()} qualifying (occ x age 25-99 x sex x PERNP>0), ${stateFipsSeen.size} distinct STATE codes seen, ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed.`
  );

  // ---- National combos (fallback source + always-bundled small file) ----
  const nationalCombos: any[] = [];
  for (const cat of CATEGORIES) {
    for (const ab of AGE_BANDS) {
      for (const sex of ["1", "2"]) {
        const key = `${cat.id}|${ab.id}|${sex}`;
        const bucket = nationalBuckets.get(key);
        const rawCount = bucket ? bucket.values.length : 0;
        nationalCombos.push({
          occId: cat.id,
          ageBand: ab.id,
          sex,
          rawCount,
          anchors: bucket ? weightedPercentileAnchors(bucket) : [],
        });
      }
    }
  }
  const nationalOut = {
    meta: {
      source:
        "US Census Bureau, ACS 2020-2024 5-Year PUMS person records (national file, psam_pus.csv) — PERNP earnings, PWGTP-weighted, ADJINC-adjusted to constant 2024 dollars",
      sourceUrl: "https://www2.census.gov/programs-surveys/acs/data/pums/2024/5-Year/csv_pus.zip",
      acs5YearRange: "2020-2024",
      generatedAt: new Date().toISOString(),
      ageBands: AGE_BANDS.map((b) => b.id),
      note: "Used both as the nationwide 'occupation' card baseline AND as the fallback distribution for any state combo whose raw (unweighted) record count is below " + MIN_RAW_COUNT_FOR_OWN_DATA + " — see public/us-occupation/*.json's fallback flag.",
    },
    combos: nationalCombos,
  };
  fs.writeFileSync(
    path.join(__dirname, "../data/us/occupationIncomeNational.json"),
    JSON.stringify(nationalOut)
  );
  console.log("Wrote data/us/occupationIncomeNational.json");

  // ---- Per-state combos ----
  const outDir = path.join(__dirname, "../public/us-occupation");
  fs.mkdirSync(outDir, { recursive: true });

  let statesWritten = 0;
  const statesMissingData: string[] = [];
  for (const state of US_STATES) {
    const combos: any[] = [];
    let anyData = false;
    for (const cat of CATEGORIES) {
      for (const ab of AGE_BANDS) {
        for (const sex of ["1", "2"]) {
          const key = `${state.fips}|${cat.id}|${ab.id}|${sex}`;
          const bucket = stateBuckets.get(key);
          const rawCount = bucket ? bucket.values.length : 0;
          if (rawCount > 0) anyData = true;
          const fallback = rawCount < MIN_RAW_COUNT_FOR_OWN_DATA;
          combos.push(
            fallback
              ? { occId: cat.id, ageBand: ab.id, sex, rawCount, fallback: true }
              : { occId: cat.id, ageBand: ab.id, sex, rawCount, fallback: false, anchors: weightedPercentileAnchors(bucket!) }
          );
        }
      }
    }
    if (!anyData) {
      statesMissingData.push(`${state.abbr} (${state.name})`);
      continue;
    }
    fs.writeFileSync(path.join(outDir, `${state.abbr}.json`), JSON.stringify({ state: state.abbr, combos }));
    statesWritten++;
  }

  console.log(`Wrote ${statesWritten}/${US_STATES.length} state files to public/us-occupation/.`);
  if (statesMissingData.length) {
    console.error("FAILED for these states (no qualifying PUMS rows found at all — not estimated, not filled in):", statesMissingData.join(", "));
  }
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
