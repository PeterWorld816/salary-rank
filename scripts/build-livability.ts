// Builds public/data/livability.json for /us/where-to-live — run with
// `npm run build:livability` whenever BEA or the ACS publishes a new vintage.
// The page lazy-fetches the output; nothing here is bundled into the app.
//
// Sources (every value below is read from these files, nothing estimated):
//   BEA Regional Price Parities, "RPPs: All items" (LineCode 1), US = 100.
//     SARPP — "Regional price parities by state" (apps.bea.gov/regional/zip/SARPP.zip)
//     MARPP — "Regional price parities by MSA"   (apps.bea.gov/regional/zip/MARPP.zip)
//     Release read from the zips' footnote files ("Last updated: February 19,
//     2026-- new statistics for 2024"); metros delineated per OMB bulletin
//     no. 23-01 (July 21, 2023).
//   Census ACS 5-year, table-based Summary File (www2.census.gov — no API
//   key needed). Variable meanings checked against ACS{year}5YR_Table_Shells.txt:
//     B25031 "Median Gross Rent by Bedrooms": _003 1 bedroom, _004 2 bedrooms,
//            _005 3 bedrooms (universe: renter-occupied units paying cash rent)
//     B25077 "Median Value (Dollars)": _001 (owner-occupied housing units)
//     B19013 "Median Household Income": _001 (display only, never scored)
//   GEO_IDs: state "0400000US{fips}", CBSA "310M###US{cbsa}" (the M### part is
//   the delineation vintage). Summary level 310 includes micropolitan areas;
//   only CBSAs that BEA also publishes (metros) are kept — the join is by
//   code, never by name.
//
// ACS annotation values (census.gov "Notes on ACS Estimate and Annotation
// Values"): a negative estimate (-666666666 etc.) means no value → stored as
// null ("n/a"). A margin of error of -333333333 means "the median falls in the
// lowest or highest interval of an open-ended distribution" — the estimate
// is then the edge value (rent 3,501 = "$3,500+", value 2,000,001 =
// "$2,000,000+"). It's kept for scoring and flagged.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ACS_YEAR = 2024; // 2020–2024 5-year: the same period as the rest of /us
const ACS_BASE = `https://www2.census.gov/programs-surveys/acs/summary_file/${ACS_YEAR}/table-based-SF`;
const SOURCES = {
  sarpp: "https://apps.bea.gov/regional/zip/SARPP.zip",
  marpp: "https://apps.bea.gov/regional/zip/MARPP.zip",
  shells: `${ACS_BASE}/documentation/ACS${ACS_YEAR}5YR_Table_Shells.txt`,
  b25031: `${ACS_BASE}/data/5YRData/acsdt5y${ACS_YEAR}-b25031.dat`,
  b25077: `${ACS_BASE}/data/5YRData/acsdt5y${ACS_YEAR}-b25077.dat`,
  b19013: `${ACS_BASE}/data/5YRData/acsdt5y${ACS_YEAR}-b19013.dat`,
};
const CACHE = path.join(__dirname, "output/livability-raw");
const OUT = path.join(__dirname, "../public/data/livability.json");
const REPORT = path.join(__dirname, "output/livabilityReport.json");

// Two-letter codes for the 50 states + DC, by FIPS.
import { US_STATES } from "../data/us/stateMeta";

// When each file was actually fetched — with LIVABILITY_OFFLINE=1 (reuse the
// cached raw files) that's the cache file's time, not this run's.
const fetchedAt: number[] = [];
async function download(key: keyof typeof SOURCES): Promise<Buffer> {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, path.basename(new URL(SOURCES[key]).pathname));
  if (process.env.LIVABILITY_OFFLINE === "1" && fs.existsSync(file)) {
    fetchedAt.push(fs.statSync(file).mtimeMs);
    return fs.readFileSync(file);
  }
  const res = await fetch(SOURCES[key]);
  if (!res.ok) throw new Error(`${SOURCES[key]} → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  fetchedAt.push(Date.now());
  return buf;
}

// Minimal .zip reader (central directory + deflate) — enough for BEA's zips.
function unzip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("not a zip");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataStart, dataStart + size);
    out.set(name, method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) {
      cells.push(cur);
      cur = "";
    } else cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

type RppRow = { code: string; name: string; rpp: number };
function readRpp(zip: Map<string, Buffer>, prefix: string): { rows: RppRow[]; year: number; updated: string; table: string } {
  const csvName = [...zip.keys()].find((k) => k.startsWith(prefix) && k.endsWith(".csv"));
  const footName = [...zip.keys()].find((k) => k.startsWith(`${prefix}__Footnotes`));
  const defName = [...zip.keys()].find((k) => k.startsWith(`${prefix}__definition`));
  if (!csvName || !footName || !defName) throw new Error(`${prefix}: files missing in zip`);
  const lines = zip.get(csvName)!.toString("latin1").split(/\r?\n/);
  const head = parseCsvLine(lines[0]);
  const year = Math.max(...head.filter((h) => /^\d{4}$/.test(h)).map(Number));
  const yi = head.indexOf(String(year));
  const rows: RppRow[] = [];
  for (const line of lines.slice(1)) {
    const c = parseCsvLine(line);
    if (c.length < head.length || c[4] !== "1") continue; // LineCode 1 = RPPs: All items
    if (!/All items/.test(c[6])) throw new Error(`${prefix}: LineCode 1 is "${c[6]}"`);
    const v = Number(c[yi]);
    if (!Number.isFinite(v)) continue; // "(NA)"
    rows.push({ code: c[0], name: c[1].replace(/\s*\*$/, ""), rpp: v });
  }
  const foot = zip.get(footName)!.toString("latin1").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  const updated = foot.match(/Last updated:\s*([A-Za-z]+ \d{1,2}, \d{4})/)?.[1] ?? "unknown";
  const table = zip.get(defName)!.toString("latin1").match(/Name="([^"]+)"/)?.[1] ?? prefix;
  return { rows, year, updated, table };
}

type AcsVal = { value: number | null; edge: "upper" | "lower" | null };
// GEO_ID → [estimate, MOE] per requested variable index.
function readAcs(buf: Buffer, vars: string[]): Map<string, AcsVal[]> {
  const text = buf.toString("latin1");
  const lines = text.split("\n");
  const head = lines[0].trim().split("|");
  const idx = vars.map((v) => {
    const [table, n] = v.split("_");
    return { e: head.indexOf(`${table}_E${n}`), m: head.indexOf(`${table}_M${n}`) };
  });
  if (idx.some((i) => i.e < 0 || i.m < 0)) throw new Error(`ACS columns missing for ${vars.join(",")}`);
  const out = new Map<string, AcsVal[]>();
  for (const line of lines.slice(1)) {
    if (!line.startsWith("0400000US") && !line.startsWith("310M")) continue;
    const c = line.trim().split("|");
    out.set(
      c[0],
      idx.map(({ e, m }) => {
        const est = Number(c[e]);
        const moe = Number(c[m]);
        if (!Number.isFinite(est) || est < 0) return { value: null, edge: null };
        // Which edge: the open-ended interval at the top or the bottom.
        const edge = moe === -333333333 ? (est >= 1000 && String(est).endsWith("1") ? "upper" : "lower") : null;
        return { value: est, edge };
      })
    );
  }
  return out;
}

function checkShell(shells: string, id: string, label: RegExp) {
  const row = shells.split(/\r?\n/).find((l) => l.split("|")[3] === id);
  if (!row || !label.test(row)) throw new Error(`Table shell check failed for ${id}: ${row ?? "(missing)"}`);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const [sarppZip, marppZip, shellsBuf, b25031, b25077, b19013] = await Promise.all([
    download("sarpp"),
    download("marpp"),
    download("shells"),
    download("b25031"),
    download("b25077"),
    download("b19013"),
  ]);
  const downloadedAt = new Date(Math.min(...fetchedAt)).toISOString();

  const shells = shellsBuf.toString("latin1");
  checkShell(shells, "B25031_003", /\|1 bedroom\|Median Gross Rent by Bedrooms\|/);
  checkShell(shells, "B25031_004", /\|2 bedrooms\|Median Gross Rent by Bedrooms\|/);
  checkShell(shells, "B25031_005", /\|3 bedrooms\|Median Gross Rent by Bedrooms\|/);
  checkShell(shells, "B25077_001", /\|Median value \(dollars\)\|.*Owner-occupied housing units/i);
  checkShell(shells, "B19013_001", /\|Median household income/i);

  const sa = readRpp(unzip(sarppZip), "SARPP");
  const ma = readRpp(unzip(marppZip), "MARPP");
  const rent = readAcs(b25031, ["B25031_003", "B25031_004", "B25031_005"]);
  const value = readAcs(b25077, ["B25077_001"]);
  const income = readAcs(b19013, ["B19013_001"]);

  // CBSA code → ACS GEO_ID (the M### vintage part varies by release).
  const acsCbsa = new Map<string, string>();
  for (const id of rent.keys()) {
    const m = id.match(/^310M\d{3}US(\d{5})$/);
    if (m) acsCbsa.set(m[1], id);
  }

  type Area = {
    id: string;
    slug: string;
    type: "metro" | "state";
    name: string;
    states: string[];
    rpp: number;
    rent: { "1": number | null; "2": number | null; "3": number | null };
    homeValue: number | null;
    medHhIncome: number | null;
    flags: string[];
  };
  const areas: Area[] = [];
  const excluded: { code: string; name: string; reason: string }[] = [];

  function build(type: Area["type"], code: string, name: string, states: string[], rpp: number, geoId: string): Area {
    const r = rent.get(geoId) ?? [];
    const v = value.get(geoId)?.[0];
    const inc = income.get(geoId)?.[0];
    const flags: string[] = [];
    (["1", "2", "3"] as const).forEach((b, i) => {
      if (r[i]?.edge) flags.push(`rent${b}-${r[i]!.edge === "upper" ? "topcoded" : "bottomcoded"}`);
      if (r[i]?.value == null) flags.push(`rent${b}-na`);
    });
    if (v?.edge) flags.push(`homeValue-${v.edge === "upper" ? "topcoded" : "bottomcoded"}`);
    if (v?.value == null) flags.push("homeValue-na");
    return {
      id: type === "state" ? `state-${states[0].toLowerCase()}` : `cbsa-${code}`,
      slug: slugify(name),
      type,
      name,
      states,
      rpp,
      rent: { "1": r[0]?.value ?? null, "2": r[1]?.value ?? null, "3": r[2]?.value ?? null },
      homeValue: v?.value ?? null,
      medHhIncome: inc?.value ?? null,
      flags,
    };
  }

  for (const s of US_STATES) {
    const row = sa.rows.find((r) => r.code === `${s.fips}000`);
    const geoId = `0400000US${s.fips}`;
    if (!row) excluded.push({ code: s.fips, name: s.name, reason: "no BEA state RPP" });
    else if (!rent.has(geoId)) excluded.push({ code: s.fips, name: s.name, reason: "no ACS state row" });
    else areas.push(build("state", s.fips, s.name, [s.abbr], row.rpp, geoId));
  }

  const beaMetroCodes = new Set<string>();
  for (const row of ma.rows) {
    if (row.code === "00000" || row.code === "00998" || row.code === "00999") continue; // US / metro / nonmetro portions
    beaMetroCodes.add(row.code);
    // Usually " (Metropolitan Statistical Area)"; at least one row
    // (Bridgeport-Stamford-Danbury, CT) carries it without parentheses.
    const name = row.name.replace(/\s*\(?Metropolitan Statistical Area\)?\s*$/, "");
    const geoId = acsCbsa.get(row.code);
    if (!geoId) {
      excluded.push({ code: row.code, name, reason: "in BEA, not in ACS 5-year CBSA list" });
      continue;
    }
    const states = (name.split(",").pop() ?? "").trim().split("-").filter((x) => /^[A-Z]{2}$/.test(x));
    areas.push(build("metro", row.code, name, states, row.rpp, geoId));
  }
  // ACS CBSAs BEA doesn't publish: micropolitan areas (BEA's MSA table is
  // metro-only) and Puerto Rico metros. Counted, and listed in the report.
  const acsOnly = [...acsCbsa.keys()].filter((c) => !beaMetroCodes.has(c));

  const json = {
    meta: {
      title: "Where can your income live best? — area inputs",
      generatedAt: downloadedAt,
      sources: [
        {
          agency: "U.S. Bureau of Economic Analysis",
          table: `${sa.table} (SARPP), line 1 "RPPs: All items"`,
          year: sa.year,
          released: sa.updated,
          url: SOURCES.sarpp,
          downloadedAt,
        },
        {
          agency: "U.S. Bureau of Economic Analysis",
          table: `${ma.table} (MARPP), line 1 "RPPs: All items"; metros per OMB bulletin 23-01`,
          year: ma.year,
          released: ma.updated,
          url: SOURCES.marpp,
          downloadedAt,
        },
        {
          agency: "U.S. Census Bureau",
          table: "ACS 5-year B25031 Median Gross Rent by Bedrooms (_003/_004/_005 = 1/2/3 bedrooms)",
          year: `${ACS_YEAR - 4}-${ACS_YEAR}`,
          url: SOURCES.b25031,
          downloadedAt,
        },
        {
          agency: "U.S. Census Bureau",
          table: "ACS 5-year B25077 Median Value (Dollars), owner-occupied housing units",
          year: `${ACS_YEAR - 4}-${ACS_YEAR}`,
          url: SOURCES.b25077,
          downloadedAt,
        },
        {
          agency: "U.S. Census Bureau",
          table: "ACS 5-year B19013 Median Household Income (display only)",
          year: `${ACS_YEAR - 4}-${ACS_YEAR}`,
          url: SOURCES.b19013,
          downloadedAt,
        },
      ],
      vintages: { rpp: sa.year, rppReleased: sa.updated, acs5: `${ACS_YEAR - 4}-${ACS_YEAR}` },
      notes: {
        topcoded:
          "ACS medians in the open-ended top interval are published as the interval edge (gross rent 3,501 = $3,500+, home value 2,000,001 = $2,000,000+). They are used as-is and flagged *-topcoded.",
        na: "A missing ACS median (insufficient sample) is null and flagged *-na; areas missing the value a calculation needs are left out of that calculation.",
      },
      counts: { states: areas.filter((a) => a.type === "state").length, metros: areas.filter((a) => a.type === "metro").length },
    },
    areas,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(json));
  const raw = fs.statSync(OUT).size;
  const gz = zlib.gzipSync(fs.readFileSync(OUT)).length;
  fs.writeFileSync(
    REPORT,
    JSON.stringify(
      {
        generatedAt: downloadedAt,
        sizes: { raw, gzip: gz },
        excluded,
        acsOnlyCbsaCount: acsOnly.length,
        acsOnlyCbsa: acsOnly,
        flagged: areas.filter((a) => a.flags.length).map((a) => ({ id: a.id, name: a.name, flags: a.flags })),
      },
      null,
      1
    )
  );
  console.log(`[livability] ${json.meta.counts.states} states + ${json.meta.counts.metros} metros → ${OUT}`);
  console.log(`[livability] size ${raw} B raw, ${gz} B gzip`);
  console.log(`[livability] RPP ${sa.year} (released ${sa.updated}); ACS ${ACS_YEAR - 4}-${ACS_YEAR}`);
  console.log(`[livability] excluded (BEA without ACS): ${excluded.length}; ACS-only CBSAs (micro/PR): ${acsOnly.length}`);
  for (const e of excluded) console.log(`  - ${e.code} ${e.name}: ${e.reason}`);
  console.log(`[livability] flagged areas: ${areas.filter((a) => a.flags.length).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
