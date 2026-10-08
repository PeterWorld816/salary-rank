// Build-time pipeline for the detailed-occupation / education / potential-
// experience earnings percentiles — the follow-up to
// scripts/buildOccupationIncome.ts (major-group occupation x state x age x
// sex, which stays as-is and keeps feeding the map's occupation shading).
//
// Same source, same definitions as that script, on purpose — turning one of
// these filters on must never change what "income" means:
//   - Source: ACS 2020-2024 5-Year PUMS person records (national csv_pus.zip,
//     psam_pusa..d.csv), https://www2.census.gov/programs-surveys/acs/data/pums/2024/5-Year/csv_pus.zip
//   - Income: PERNP (total person's earnings) x ADJINC/1e6 -> constant 2024
//     dollars; only PERNP > 0 records count.
//   - Weight: PWGTP.
//   - Small-sample rule: a combo with fewer than 100 raw (unweighted) records
//     is never published; the client falls back to a broader combo and says so.
//
// Code lists are read from the official dictionary, never typed in by hand:
//   https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_2020-2024.csv
// pass its path as the first argument. OCCP labels come from its VAL rows;
// SCHL grouping uses its codes 01-24 (see EDUCATION below).
//
// Run:
//   npx tsx scripts/buildDetailedEarnings.ts <PUMS_Data_Dictionary_2020-2024.csv> <psam_pusa.csv> [psam_pusb.csv ...]
//
// Outputs (all small, all lazily fetched except the picker index):
//   data/us/occupationDetails.json           picker index (bundled): detail
//                                            groups -> OCCP codes, labels, counts
//   public/us-occupation-detail/<id>.json    one detail occupation: national
//                                            x age x sex, national x age,
//                                            national (all), state (all ages/sexes)
//   public/us-education/<id>.json            one education level: national x
//                                            age x sex, national x age, national
//                                            x major occupation, state x age
//   public/us-experience.json                potential experience x education x sex
//   scripts/output/detailedEarningsReport.json  selection/fallback/QA numbers
import fs from "node:fs";
import readline from "node:readline";
import path from "node:path";
import occupationCategoriesData from "../data/us/occupationCategories.json";
import { US_STATES } from "../data/us/stateMeta";
import type { PercentileAnchor } from "../lib/percentileTable";

const MIN_RAW = 100;
// Occupations the brief named as "must be separable" (plus cooks/waiters for
// the sanity check) — counts logged, FT/YR medians reported for QA.
const WATCH = [1305, 1360, 1460, 1410, 1430, 1320, 1021, 1022, 3255, 3258, 3090, 2100, 2300, 2310, 2320, 2205, 800, 845, 850, 4020, 4110];
const TOP_PERCENT_POINTS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99];
const ACS_RANGE = "2020-2024";
const SOURCE =
  "US Census Bureau, ACS 2020-2024 5-Year PUMS person records (national file) — PERNP earnings, PWGTP-weighted, ADJINC-adjusted to constant 2024 dollars";
const SOURCE_URL = "https://www2.census.gov/programs-surveys/acs/data/pums/2024/5-Year/csv_pus.zip";
const DICT_URL = "https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_2020-2024.csv";

// Same age bands as buildOccupationIncome.ts.
const AGE_BANDS = [
  { id: "25-34", lo: 25, hi: 34 },
  { id: "35-44", lo: 35, hi: 44 },
  { id: "45-54", lo: 45, hi: 54 },
  { id: "55-64", lo: 55, hi: 64 },
  { id: "65-99", lo: 65, hi: 99 },
];

// SCHL (PUMS_Data_Dictionary_2020-2024, "Educational attainment"):
//   01-15 no schooling .. 12th grade no diploma, 16 regular HS diploma,
//   17 GED/alternative, 18 some college <1yr, 19 1+ yrs college no degree,
//   20 associate's, 21 bachelor's, 22 master's, 23 professional degree
//   beyond a bachelor's, 24 doctorate.
const EDUCATION = [
  { id: "hs_or_less", lo: 1, hi: 17 },
  { id: "some_college", lo: 18, hi: 20 },
  { id: "bachelors", lo: 21, hi: 21 },
  { id: "masters", lo: 22, hi: 22 },
  { id: "professional", lo: 23, hi: 23 },
  { id: "doctorate", lo: 24, hi: 24 },
];
function eduIndex(schl: number): number {
  return EDUCATION.findIndex((e) => schl >= e.lo && schl <= e.hi);
}

// Potential experience = age - years of schooling - 6 (the standard
// Mincer-style construction; ACS has no tenure/experience variable).
// Years of schooling by SCHL code:
//   01-03 (none / nursery / kindergarten) 0; 04-14 (grades 1-11) 1-11;
//   15 (12th grade, no diploma) 11; 16-17 (HS diploma / GED) 12;
//   18-19 (some college, no degree) 13; 20 (associate's) 14;
//   21 (bachelor's) 16; 22 (master's) 18; 23 (professional) 19;
//   24 (doctorate) 21.
// Same table is shown on the About page.
function schoolingYears(schl: number): number {
  if (schl <= 3) return 0;
  if (schl <= 14) return schl - 3;
  if (schl === 15) return 11;
  if (schl <= 17) return 12;
  if (schl <= 19) return 13;
  if (schl === 20) return 14;
  if (schl === 21) return 16;
  if (schl === 22) return 18;
  if (schl === 23) return 19;
  return 21;
}
const EXPERIENCE = [
  { id: "0-4", lo: 0, hi: 4 },
  { id: "5-9", lo: 5, hi: 9 },
  { id: "10-19", lo: 10, hi: 19 },
  { id: "20-29", lo: 20, hi: 29 },
  { id: "30plus", lo: 30, hi: 999 },
];
// Experience combos use ages 18+ so that 0-4 years exists for people who
// stopped at high school; every other combo keeps the 25+ bands above.
const EXPERIENCE_MIN_AGE = 18;

const MAJORS = occupationCategoriesData.categories
  .filter((c) => (c as { selectable?: boolean }).selectable !== false)
  .map((c) => ({ id: c.id, range: c.occpRange as [number, number], label: c.label.en }));
function majorOf(occp: number): string | null {
  for (const m of MAJORS) if (occp >= m.range[0] && occp <= m.range[1]) return m.id;
  return null;
}

// ── weighted percentiles (identical to buildOccupationIncome.ts) ──────────
function anchorsFor(values: Float64Array, weights: Float64Array): PercentileAnchor[] {
  const n = values.length;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => values[b] - values[a]);
  const v = idx.map((i) => values[i]);
  const w = idx.map((i) => weights[i]);
  const total = w.reduce((a, b) => a + b, 0);
  function at(frac: number): number {
    const target = frac * total;
    let before = 0;
    for (let i = 0; i < n; i++) {
      const after = before + w[i];
      if (after >= target || i === n - 1) {
        if (i === 0) return v[0];
        const t = w[i] > 0 ? (target - before) / w[i] : 0;
        return v[i - 1] + (v[i] - v[i - 1]) * t;
      }
      before = after;
    }
    return v[n - 1];
  }
  const out: PercentileAnchor[] = [];
  for (const p of TOP_PERCENT_POINTS) {
    const value = Math.round(at(p / 100));
    if (out.length === 0 || out[out.length - 1].value !== value) out.push({ topPercent: p, value });
  }
  out.push({ topPercent: 100, value: 1 });
  return out;
}

// ── record store ──────────────────────────────────────────────────────────
// Typed arrays rather than objects: ~9M kept records have to fit in a few
// hundred MB. Float32 income is exact to well under $1 at these magnitudes;
// PWGTP is an integer of at most 5 digits.
const CAP = 14_000_000;
const R = {
  n: 0,
  income: new Float32Array(CAP),
  weight: new Uint32Array(CAP),
  occp: new Uint16Array(CAP),
  state: new Uint8Array(CAP),
  age: new Uint8Array(CAP),
  sex: new Uint8Array(CAP),
  schl: new Uint8Array(CAP),
  // QA only (cross-check vs Census B24121, which is full-time year-round):
  // 1 when WKHP >= 35 and WKWN >= 50.
  ftyr: new Uint8Array(CAP),
};

// Record -> group membership, stored CSR-style (one Int32Array of record
// indices + per-group offsets) so ~100M memberships cost 4 bytes each
// instead of a JS array per group. Built in two passes over the same
// membership function: count, then fill.
class Groups {
  private ids = new Map<string, number>();
  private offsets!: Int32Array;
  private members!: Int32Array;
  build(n: number, memberships: (i: number, emit: (key: string) => void) => void) {
    const counts: number[] = [];
    for (let i = 0; i < n; i++)
      memberships(i, (key) => {
        let id = this.ids.get(key);
        if (id === undefined) this.ids.set(key, (id = counts.push(0) - 1));
        counts[id]++;
      });
    this.offsets = new Int32Array(counts.length + 1);
    for (let g = 0; g < counts.length; g++) this.offsets[g + 1] = this.offsets[g] + counts[g];
    this.members = new Int32Array(this.offsets[counts.length]);
    const cursor = this.offsets.slice(0, counts.length);
    for (let i = 0; i < n; i++) memberships(i, (key) => (this.members[cursor[this.ids.get(key)!]++] = i));
    console.log(`Grouped: ${counts.length.toLocaleString()} groups, ${this.members.length.toLocaleString()} memberships`);
  }
  private slice(key: string): Int32Array | null {
    const id = this.ids.get(key);
    return id === undefined ? null : this.members.subarray(this.offsets[id], this.offsets[id + 1]);
  }
  count(key: string): number {
    return this.slice(key)?.length ?? 0;
  }
  anchors(key: string): PercentileAnchor[] | null {
    const ids = this.slice(key);
    if (!ids || ids.length < MIN_RAW) return null;
    const v = new Float64Array(ids.length);
    const w = new Float64Array(ids.length);
    ids.forEach((id, j) => {
      v[j] = R.income[id];
      w[j] = R.weight[id];
    });
    return anchorsFor(v, w);
  }
  // Weighted median — for the QA report only.
  median(key: string): number | null {
    const ids = this.slice(key);
    if (!ids || ids.length === 0) return null;
    const pairs = Array.from(ids, (id) => [R.income[id], R.weight[id]] as const).sort((x, y) => x[0] - y[0]);
    const total = pairs.reduce((acc, q) => acc + q[1], 0);
    let cum = 0;
    for (const [v, w] of pairs) {
      cum += w;
      if (cum >= total / 2) return Math.round(v);
    }
    return null;
  }
}

function ageBandOf(age: number): string | null {
  return AGE_BANDS.find((b) => age >= b.lo && age <= b.hi)?.id ?? null;
}

function readOccpLabels(dictPath: string): Map<number, string> {
  const labels = new Map<number, string>();
  for (const line of fs.readFileSync(dictPath, "utf8").split(/\r?\n/)) {
    // VAL,OCCP,C,4,"0010","0010","MGR-Chief Executives And Legislators"
    const m = line.match(/^VAL,OCCP,C,4,"(\d{4})","\d{4}","(.*)"$/);
    if (m) labels.set(Number(m[1]), m[2].replace(/^[A-Z]{3}-/, "").trim());
  }
  return labels;
}

function checkSchlCodes(dictPath: string) {
  const codes = fs
    .readFileSync(dictPath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^VAL,SCHL,C,2,"(\d{2})","\d{2}","(.*)"$/))
    .filter(Boolean)
    .map((m) => [Number(m![1]), m![2]] as const);
  const expect: Record<number, RegExp> = {
    16: /high school diploma/i,
    17: /GED/i,
    20: /Associate/i,
    21: /Bachelor/i,
    22: /Master/i,
    23: /Professional degree/i,
    24: /Doctorate/i,
  };
  for (const [code, re] of Object.entries(expect)) {
    const row = codes.find(([c]) => c === Number(code));
    if (!row || !re.test(row[1])) throw new Error(`FAILED: SCHL ${code} in dictionary doesn't match the expected label (${row?.[1]})`);
  }
  console.log(`SCHL codes verified against dictionary (${codes.length} values).`);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

async function main() {
  const [dictPath, ...csvPaths] = process.argv.slice(2);
  if (!dictPath || csvPaths.length === 0) {
    console.error("Usage: npx tsx scripts/buildDetailedEarnings.ts <PUMS_Data_Dictionary.csv> <psam_pus*.csv>...");
    process.exit(1);
  }
  for (const p of [dictPath, ...csvPaths]) if (!fs.existsSync(p)) throw new Error(`FAILED: not found ${p}`);
  const occpLabels = readOccpLabels(dictPath);
  console.log(`OCCP codes read from dictionary: ${occpLabels.size}`);
  checkSchlCodes(dictPath);
  const fipsToAbbr = new Map(US_STATES.map((s) => [Number(s.fips), s.abbr]));

  const t0 = Date.now();
  let total = 0;
  for (const csvPath of csvPaths) {
    console.log(`Streaming ${csvPath} ...`);
    const rl = readline.createInterface({ input: fs.createReadStream(csvPath, { encoding: "utf8", highWaterMark: 1 << 20 }), crlfDelay: Infinity });
    let ix: Record<string, number> = {};
    let first = true;
    for await (const line of rl) {
      if (first) {
        const h = line.split(",");
        ix = Object.fromEntries(["STATE", "ADJINC", "PWGTP", "AGEP", "SEX", "OCCP", "PERNP", "SCHL", "WKHP", "WKWN"].map((k) => [k, h.indexOf(k)]));
        const missing = Object.entries(ix).filter(([, v]) => v < 0);
        if (missing.length) throw new Error(`FAILED: missing columns ${missing.map(([k]) => k)} in ${csvPath}`);
        first = false;
        continue;
      }
      if (!line) continue;
      total++;
      if (total % 2_000_000 === 0) console.log(`  ${(total / 1e6).toFixed(0)}M rows, ${R.n.toLocaleString()} kept, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      const f = line.split(",");
      const pernp = Number(f[ix.PERNP]);
      if (!(pernp > 0)) continue;
      const adjinc = Number(f[ix.ADJINC]);
      const weight = Number(f[ix.PWGTP]);
      const age = Number(f[ix.AGEP]);
      const sex = Number(f[ix.SEX]);
      if (!(adjinc > 0) || !(weight > 0) || !(age >= EXPERIENCE_MIN_AGE) || (sex !== 1 && sex !== 2)) continue;
      const i = R.n++;
      if (i >= CAP) throw new Error("FAILED: record store capacity exceeded");
      R.income[i] = pernp * (adjinc / 1_000_000);
      R.weight[i] = weight;
      R.occp[i] = f[ix.OCCP] ? Number(f[ix.OCCP]) : 0;
      R.state[i] = Number(f[ix.STATE]);
      R.age[i] = Math.min(age, 255);
      R.sex[i] = sex;
      R.schl[i] = f[ix.SCHL] ? Number(f[ix.SCHL]) : 0;
      R.ftyr[i] = Number(f[ix.WKHP]) >= 35 && Number(f[ix.WKWN]) >= 50 ? 1 : 0;
    }
  }
  console.log(`Read ${total.toLocaleString()} person rows; kept ${R.n.toLocaleString()} (PERNP>0, age ${EXPERIENCE_MIN_AGE}+, SEX 1/2) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  // ── 1. Detailed occupation selection, decided by the data ───────────────
  const count2564 = new Map<number, number>();
  for (let i = 0; i < R.n; i++) {
    if (R.age[i] < 25 || R.age[i] > 64 || !R.occp[i] || !majorOf(R.occp[i])) continue;
    count2564.set(R.occp[i], (count2564.get(R.occp[i]) ?? 0) + 1);
  }
  function groupCount(threshold: number): number {
    let n = 0;
    for (const m of MAJORS) {
      const codes = [...count2564.keys()].filter((c) => majorOf(c) === m.id);
      const big = codes.filter((c) => count2564.get(c)! >= threshold);
      n += big.length + (big.length < codes.length ? 1 : 0);
    }
    return n;
  }
  const thresholdTable = [1500, 3000, 5000, 8000, 10000, 12000, 14000, 16000, 18000, 20000, 25000, 30000].map((t) => ({ threshold: t, groups: groupCount(t) }));
  console.log("threshold -> groups:", thresholdTable.map((r) => `${r.threshold}:${r.groups}`).join(" "));
  // Chosen from the 2020-2024 run's own counts (threshold -> groups:
  // 1500:434 3000:331 5000:250 8000:197 10000:171 12000:154 14000:144 ...):
  // 10,000 raw 25-64 records is the highest cut that still keeps architects
  // (OCCP 1305, 10,156 records) apart from the "other architecture &
  // engineering" pool, along with electrical (1410, 11,929) and industrial
  // (1430, 12,738) engineers. 171 groups is a little above the ~150 target;
  // at 10,000+ records each occupation also clears 100 records in nearly
  // every age x sex cell (see the report's occupationAgeSexFallbacks).
  // Override with DETAIL_THRESHOLD=<n> to explore.
  const THRESHOLD = process.env.DETAIL_THRESHOLD ? Number(process.env.DETAIL_THRESHOLD) : 10000;
  // Occupations the brief named as "must be separable" — logged so the
  // report shows whether the data-driven threshold actually separates them.
  const watch = WATCH;
  console.log("watch list (OCCP: raw 25-64):", watch.map((c) => `${c}=${count2564.get(c) ?? 0}`).join(" "));
  console.log(`Using detail threshold ${THRESHOLD} raw records (age 25-64) -> ${groupCount(THRESHOLD)} groups`);

  type Detail = { id: string; majorId: string; occp: number[]; label: string; rawCount2564: number; isOther: boolean };
  const details: Detail[] = [];
  const occpToDetail = new Map<number, string>();
  for (const m of MAJORS) {
    const codes = [...count2564.keys()].filter((c) => majorOf(c) === m.id).sort((a, b) => a - b);
    const other: number[] = [];
    for (const c of codes) {
      if (count2564.get(c)! >= THRESHOLD) {
        const label = occpLabels.get(c);
        if (!label) throw new Error(`FAILED: OCCP ${c} not in dictionary`);
        const id = `${slug(label)}_${c}`;
        details.push({ id, majorId: m.id, occp: [c], label, rawCount2564: count2564.get(c)!, isOther: false });
        occpToDetail.set(c, id);
      } else other.push(c);
    }
    if (other.length) {
      const id = `other_${m.id}`;
      details.push({
        id,
        majorId: m.id,
        occp: other,
        label: `Other ${m.label} occupations`,
        rawCount2564: other.reduce((s, c) => s + count2564.get(c)!, 0),
        isOther: true,
      });
      for (const c of other) occpToDetail.set(c, id);
    }
  }

  // ── 2. Group records ────────────────────────────────────────────────────
  // Key namespaces:
  //   o:detail|age|sex  o:detail|age  o:detail  os:state|detail
  //   e:edu|age|sex     e:edu|age     e:edu     em:edu|major   es:state|edu|age
  //   x:exp|edu|sex     x:exp|*|sex   x:exp|*|*
  //   q:edu2564|edu     (QA medians)
  const G = new Groups();
  G.build(R.n, (i, emit) => {
    const age = R.age[i];
    const ab = ageBandOf(age);
    const ei = R.schl[i] ? eduIndex(R.schl[i]) : -1;
    const abbr = fipsToAbbr.get(R.state[i]);
    const sex = R.sex[i];
    if (ab) {
      const d = R.occp[i] ? occpToDetail.get(R.occp[i]) : undefined;
      if (d) {
        emit(`o:${d}|${ab}|${sex}`);
        emit(`o:${d}|${ab}`);
        emit(`o:${d}`);
        emit(`o:${d}|sex|${sex}`);
        if (ei >= 0) emit(`o:${d}|edu|${EDUCATION[ei].id}`);
        if (abbr) emit(`os:${abbr}|${d}`);
        if (R.ftyr[i] && WATCH.includes(R.occp[i])) emit(`q:ftyr|${R.occp[i]}`);
      }
      if (ei >= 0) {
        const e = EDUCATION[ei].id;
        emit(`e:${e}|${ab}|${sex}`);
        emit(`e:${e}|${ab}`);
        emit(`e:${e}`);
        const mj = R.occp[i] ? majorOf(R.occp[i]) : null;
        if (mj) emit(`em:${e}|${mj}`);
        if (abbr) emit(`es:${abbr}|${e}|${ab}`);
        if (age <= 64) emit(`q:edu2564|${e}`);
        // Census B20004 buckets (age 25+ with earnings): <HS, HS/GED,
        // some college/associate, bachelor's, graduate or professional.
        const s = R.schl[i];
        emit(`q:b20004|${s <= 15 ? "lths" : s <= 17 ? "hs" : s <= 20 ? "somecol" : s === 21 ? "ba" : "grad"}`);
        emit(`q:b20004|total`);
      }
    }
    // State x age personal earnings (all earners 25+) — the state pages'
    // "median earnings by age" table; national x age alongside for contrast.
    if (ab) {
      emit(`na:${ab}`);
      if (abbr) emit(`sa:${abbr}|${ab}`);
    }
    if (ei >= 0) {
      const years = Math.max(0, age - schoolingYears(R.schl[i]) - 6);
      const x = EXPERIENCE.find((band) => years >= band.lo && years <= band.hi)!.id;
      emit(`x:${x}|${EDUCATION[ei].id}|${sex}`);
      emit(`x:${x}|*|${sex}`);
      emit(`x:${x}|*|*`);
    }
  });
  const occ = { count: (k: string) => G.count(k.startsWith("s:") ? "os:" + k.slice(2) : "o:" + k), anchors: (k: string) => G.anchors(k.startsWith("s:") ? "os:" + k.slice(2) : "o:" + k), median: (k: string) => G.median("o:" + k) };
  const edu = {
    count: (k: string) => G.count(k.startsWith("s:") ? "es:" + k.slice(2) : k.startsWith("m:") ? "em:" + k.slice(2) : "e:" + k),
    anchors: (k: string) => G.anchors(k.startsWith("s:") ? "es:" + k.slice(2) : k.startsWith("m:") ? "em:" + k.slice(2) : "e:" + k),
    median: (k: string) => G.median("e:" + k),
  };
  const exp = { count: (k: string) => G.count("x:" + k), anchors: (k: string) => G.anchors("x:" + k), median: (k: string) => G.median("x:" + k) };

  const generatedAt = new Date().toISOString();
  const metaBase = {
    source: SOURCE,
    sourceUrl: SOURCE_URL,
    dictionaryUrl: DICT_URL,
    acs5YearRange: ACS_RANGE,
    incomeDefinition: "PERNP (wages/salary + self-employment earnings) > 0, x ADJINC/1e6 (constant 2024 dollars), PWGTP-weighted",
    minRawRecords: MIN_RAW,
    generatedAt,
  };
  const entry = (g: { count: (k: string) => number; anchors: (k: string) => PercentileAnchor[] | null }, key: string) => {
    const rawCount = g.count(key);
    const anchors = g.anchors(key);
    return anchors ? { rawCount, anchors } : { rawCount, fallback: true as const };
  };

  // ── 3. Write detail occupation files ────────────────────────────────────
  const root = path.join(__dirname, "..");
  const occDir = path.join(root, "public/us-occupation-detail");
  fs.rmSync(occDir, { recursive: true, force: true });
  fs.mkdirSync(occDir, { recursive: true });
  for (const d of details) {
    const byAgeSex: Record<string, unknown> = {};
    const byAge: Record<string, unknown> = {};
    for (const ab of AGE_BANDS) {
      for (const sex of [1, 2]) byAgeSex[`${ab.id}|${sex}`] = entry(occ, `${d.id}|${ab.id}|${sex}`);
      byAge[ab.id] = entry(occ, `${d.id}|${ab.id}`);
    }
    const states: Record<string, unknown> = {};
    for (const s of US_STATES) {
      const a = occ.anchors(`s:${s.abbr}|${d.id}`);
      if (a) states[s.abbr] = { rawCount: occ.count(`s:${s.abbr}|${d.id}`), anchors: a };
    }
    fs.writeFileSync(
      path.join(occDir, `${d.id}.json`),
      JSON.stringify({
        id: d.id,
        meta: metaBase,
        byAgeSex,
        byAge,
        all: entry(occ, d.id),
        // All ages, one sex / one education level — used by the occupation
        // pages (app/[locale]/occupations/[slug]); same 100-record rule.
        bySex: { "1": entry(occ, `${d.id}|sex|1`), "2": entry(occ, `${d.id}|sex|2`) },
        byEducation: Object.fromEntries(EDUCATION.map((e) => [e.id, entry(occ, `${d.id}|edu|${e.id}`)])),
        states,
      })
    );
  }
  const koPath = path.join(root, "data/us/occupationDetailLabelsKo.json");
  const ko: Record<string, string> = fs.existsSync(koPath) ? JSON.parse(fs.readFileSync(koPath, "utf8")).labels : {};
  fs.writeFileSync(
    path.join(root, "data/us/occupationDetails.json"),
    JSON.stringify(
      {
        meta: {
          ...metaBase,
          note: `Detailed occupations = OCCP codes (labels from the PUMS dictionary) with at least ${THRESHOLD} raw PERNP>0 records aged 25-64 nationwide; smaller codes in the same SOC major group are pooled into "Other ... occupations". Military excluded. Per-occupation curves live in public/us-occupation-detail/<id>.json.`,
          detailThreshold: THRESHOLD,
        },
        details: details.map((d) => ({ ...d, label: { en: d.label, ko: ko[d.id] ?? d.label } })),
      },
      null,
      0
    )
  );

  // Slim client index (bundled by the picker): only what the UI reads. The
  // full file above keeps the OCCP code lists and counts for auditing.
  fs.writeFileSync(
    path.join(root, "data/us/occupationDetailsIndex.json"),
    JSON.stringify({
      meta: { source: SOURCE, acs5YearRange: ACS_RANGE, generatedAt, note: "Client picker index — see data/us/occupationDetails.json for OCCP codes and sample counts." },
      details: details.map((d) => ({ id: d.id, majorId: d.majorId, label: { en: d.label, ko: ko[d.id] ?? d.label }, isOther: d.isOther })),
    })
  );

  // ── 4. Education files ──────────────────────────────────────────────────
  const eduDir = path.join(root, "public/us-education");
  fs.rmSync(eduDir, { recursive: true, force: true });
  fs.mkdirSync(eduDir, { recursive: true });
  for (const e of EDUCATION) {
    const byAgeSex: Record<string, unknown> = {};
    const byAge: Record<string, unknown> = {};
    for (const ab of AGE_BANDS) {
      for (const sex of [1, 2]) byAgeSex[`${ab.id}|${sex}`] = entry(edu, `${e.id}|${ab.id}|${sex}`);
      byAge[ab.id] = entry(edu, `${e.id}|${ab.id}`);
    }
    const byMajor: Record<string, unknown> = {};
    for (const m of MAJORS) byMajor[m.id] = entry(edu, `m:${e.id}|${m.id}`);
    const states: Record<string, Record<string, unknown>> = {};
    for (const s of US_STATES) {
      for (const ab of AGE_BANDS) {
        const a = edu.anchors(`s:${s.abbr}|${e.id}|${ab.id}`);
        if (!a) continue;
        (states[s.abbr] ??= {})[ab.id] = { rawCount: edu.count(`s:${s.abbr}|${e.id}|${ab.id}`), anchors: a };
      }
    }
    // Nationwide curves in one file; each state's age curves in their own
    // tiny file (fetched only when that state is on screen) so picking an
    // education level never downloads all 51 states.
    fs.writeFileSync(
      path.join(eduDir, `${e.id}.json`),
      JSON.stringify({ id: e.id, schl: [e.lo, e.hi], meta: metaBase, byAgeSex, byAge, all: entry(edu, e.id), byMajor, statesWithData: Object.keys(states) })
    );
    for (const [abbr, byAgeForState] of Object.entries(states)) {
      fs.mkdirSync(path.join(eduDir, "state", abbr), { recursive: true });
      fs.writeFileSync(path.join(eduDir, "state", abbr, `${e.id}.json`), JSON.stringify({ id: e.id, state: abbr, meta: metaBase, byAge: byAgeForState }));
    }
  }

  // ── 5. Experience file ──────────────────────────────────────────────────
  const expCombos: Record<string, unknown> = {};
  for (const x of EXPERIENCE) {
    for (const e of [...EDUCATION.map((e) => e.id), "*"]) {
      for (const sex of ["1", "2", "*"]) {
        if (e !== "*" && sex === "*") continue;
        expCombos[`${x.id}|${e}|${sex}`] = entry(exp, `${x.id}|${e}|${sex}`);
      }
    }
  }
  fs.writeFileSync(
    path.join(root, "public/us-experience.json"),
    JSON.stringify({
      meta: {
        ...metaBase,
        note: `Potential experience = age - years of schooling - 6 (floored at 0), ages ${EXPERIENCE_MIN_AGE}+. Years by SCHL: 01-03 -> 0, 04-14 -> 1-11, 15 -> 11, 16-17 -> 12, 18-19 -> 13, 20 -> 14, 21 -> 16, 22 -> 18, 23 -> 19, 24 -> 21. An estimate from age and education, NOT actual years worked.`,
        bands: EXPERIENCE.map((b) => b.id),
      },
      combos: expCombos,
    })
  );

  // ── 5b. State x age earnings medians ───────────────────────────────────
  const med = (key: string) => {
    const n = G.count(key);
    return n >= MIN_RAW ? { median: G.median(key), rawCount: n } : { median: null, rawCount: n, fallback: true };
  };
  fs.writeFileSync(
    path.join(root, "data/us/stateEarningsByAge.json"),
    JSON.stringify({
      meta: { ...metaBase, note: "Weighted median personal earnings (PERNP > 0) by age band, all earners aged 25+, per state and nationwide. Used by the state pages." },
      ageBands: AGE_BANDS.map((b) => b.id),
      national: Object.fromEntries(AGE_BANDS.map((b) => [b.id, med(`na:${b.id}`)])),
      states: Object.fromEntries(US_STATES.map((s) => [s.abbr, Object.fromEntries(AGE_BANDS.map((b) => [b.id, med(`sa:${s.abbr}|${b.id}`)]))])),
    })
  );

  // ── 6. QA report ────────────────────────────────────────────────────────
  const fallbackRows: { file: string; combo: string; rawCount: number }[] = [];
  for (const d of details)
    for (const ab of AGE_BANDS)
      for (const sex of [1, 2]) {
        const c = occ.count(`${d.id}|${ab.id}|${sex}`);
        if (c < MIN_RAW) fallbackRows.push({ file: `occupation:${d.id}`, combo: `${ab.id}|${sex === 1 ? "male" : "female"}`, rawCount: c });
      }
  const stateFallbackByDetail = details
    .map((d) => ({ id: d.id, statesWithOwnData: US_STATES.filter((s) => occ.count(`s:${s.abbr}|${d.id}`) >= MIN_RAW).length }))
    .sort((a, b) => a.statesWithOwnData - b.statesWithOwnData);
  const eduStateFallback = EDUCATION.map((e) => ({
    id: e.id,
    stateAgeCombosWithOwnData: US_STATES.reduce((n, s) => n + AGE_BANDS.filter((ab) => edu.count(`s:${s.abbr}|${e.id}|${ab.id}`) >= MIN_RAW).length, 0),
    of: US_STATES.length * AGE_BANDS.length,
  }));
  const report = {
    generatedAt,
    rowsRead: total,
    recordsKept: R.n,
    thresholdTable,
    detailThreshold: THRESHOLD,
    watchCounts2564: Object.fromEntries(watch.map((c) => [c, { label: occpLabels.get(c), raw: count2564.get(c) ?? 0, detail: occpToDetail.get(c) }])),
    detailCount: details.length,
    details: details.map((d) => ({ id: d.id, majorId: d.majorId, label: d.label, rawCount2564: d.rawCount2564, codes: d.occp.length })),
    nationalMedians: {
      education25to64: Object.fromEntries(EDUCATION.map((e) => [e.id, G.median(`q:edu2564|${e.id}`)])),
      educationAge25plus: Object.fromEntries(EDUCATION.map((e) => [e.id, edu.median(e.id)])),
      detail: Object.fromEntries(details.map((d) => [d.id, occ.median(d.id)])),
      b20004Comparable: Object.fromEntries(["lths", "hs", "somecol", "ba", "grad", "total"].map((k) => [k, G.median(`q:b20004|${k}`)])),
      fullTimeYearRoundByOccp: Object.fromEntries(WATCH.map((c) => [c, { label: occpLabels.get(c), median: G.median(`q:ftyr|${c}`) }])),
      experienceAll: Object.fromEntries(EXPERIENCE.map((x) => [x.id, exp.median(`${x.id}|*|*`)])),
    },
    occupationAgeSexFallbacks: fallbackRows.sort((a, b) => a.rawCount - b.rawCount),
    occupationStateCoverage: stateFallbackByDetail,
    educationStateCoverage: eduStateFallback,
    experienceFallbacks: Object.entries(expCombos)
      .filter(([, v]) => (v as { fallback?: boolean }).fallback)
      .map(([k, v]) => ({ combo: k, rawCount: (v as { rawCount: number }).rawCount })),
    educationMajorFallbacks: EDUCATION.flatMap((e) =>
      MAJORS.filter((m) => edu.count(`m:${e.id}|${m.id}`) < MIN_RAW).map((m) => ({ combo: `${e.id}|${m.id}`, rawCount: edu.count(`m:${e.id}|${m.id}`) }))
    ),
  };
  fs.mkdirSync(path.join(root, "scripts/output"), { recursive: true });
  fs.writeFileSync(path.join(root, "scripts/output/detailedEarningsReport.json"), JSON.stringify(report, null, 1));
  console.log(`Done: ${details.length} detail occupations, ${EDUCATION.length} education files, experience file. ${((Date.now() - t0) / 1000).toFixed(0)}s total.`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
