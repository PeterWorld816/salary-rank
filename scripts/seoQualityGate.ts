// Quality gate for the data-driven SEO pages — runs before `next build`
// (package.json "build"), and on its own with `npm run seo:gate`.
//
// Builds every page with the exact builders the routes render
// (lib/seo-pages/*), then checks:
//   1. commentary (lede + headings + paragraphs; tables excluded) has at
//      least MIN_WORDS words;
//   2. no two pages — and no page vs. an existing insight article — share
//      more than MAX_SIMILARITY of their 5-word shingles (Jaccard) on the
//      body text. A second, stricter score with numbers and proper names
//      masked out is reported too (how alike the *templates* are), but only
//      the raw score fails a page;
//   3. every data value the page's claims rest on is present.
// Pages that fail are listed in data/seo/quality-gate.json; the routes read
// that file to add noindex, and app/sitemap.ts leaves them out. The build
// itself keeps going (a failing page is withheld from search, not from the
// site) unless SEO_GATE_STRICT=1.
import fs from "node:fs";
import path from "node:path";
import countyIncome from "../data/us/countyIncome.json";
import { US_STATES } from "../data/us/stateMeta";
import { OCCUPATION_PAGES, buildOccupationHub, buildOccupationPage } from "../lib/seo-pages/occupations";
import { NET_WORTH_BRACKETS, buildNetWorthHub, buildNetWorthPage } from "../lib/seo-pages/netWorth";
import { buildStateDeepDive } from "../lib/seo-pages/stateDeepDive";
import { commentaryText, wordCount, type SeoPage } from "../lib/seo-pages/model";
import { getAllInsights, getInsightBySlug } from "../lib/insights";

const MIN_WORDS = 400;
const MIN_WORDS_HUB = 200;
const MAX_SIMILARITY = 0.6;

function shingles(text: string, mask: boolean): Set<string> {
  let t = text.toLowerCase().replace(/<[^>]+>/g, " ");
  if (mask) t = t.replace(/\$?[0-9][0-9,.]*%?×?/g, "#");
  // Digits count as part of a word in the raw pass ("$134,332" is one token),
  // so two pages that differ only in their figures aren't scored as identical;
  // the masked pass has already turned every number into "#".
  const words = t.match(/[a-z0-9#$%'’-]+(?:[.,][0-9]+)*/g) ?? [];
  const out = new Set<string>();
  for (let i = 0; i + 5 <= words.length; i++) out.add(words.slice(i, i + 5).join(" "));
  return out;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [s, l] = a.size < b.size ? [a, b] : [b, a];
  for (const x of s) if (l.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// Names that legitimately repeat across a page family (state names, the
// occupation's own name) inflate raw similarity in the masked pass less than
// the template words do, so we mask capitalised words too.
function maskNames(text: string): string {
  return text.replace(/\b[A-Z][a-zA-Z.'’-]+(?:\s+[A-Z][a-zA-Z.'’-]+)*/g, "Name");
}

type Result = {
  path: string;
  kind: SeoPage["kind"];
  words: number;
  minWords: number;
  missingData: string[];
  maxSimilarity: { with: string; raw: number; masked: number };
  pass: boolean;
  reasons: string[];
};

function main() {
  const t0 = Date.now();
  const pages: SeoPage[] = [];
  for (const e of OCCUPATION_PAGES) pages.push(buildOccupationPage(e));
  pages.push(buildOccupationHub());
  for (const b of NET_WORTH_BRACKETS) pages.push(buildNetWorthPage(b));
  pages.push(buildNetWorthHub());
  const countiesByState = new Map<string, { fips: string; name: string; medianHouseholdIncome: number | null }[]>();
  for (const c of countyIncome.counties as { fips: string; stateFips: string; name: string; medianHouseholdIncome: number | null }[])
    countiesByState.set(c.stateFips, [...(countiesByState.get(c.stateFips) ?? []), c]);
  for (const s of US_STATES) {
    const p = buildStateDeepDive(s, countiesByState.get(s.fips) ?? []);
    if (p) pages.push(p);
    else console.log(`FAIL ${`/us/${s.abbr}`}: no state data`);
  }

  const reference = getAllInsights("en").map((a) => {
    const full = getInsightBySlug("en", a.slug);
    return { path: `/us/insights/${a.slug}`, text: full?.html ?? "" };
  });

  const items = [
    ...pages.map((p) => ({ path: p.path, text: commentaryText(p), page: p as SeoPage | null })),
    ...reference.map((r) => ({ path: r.path, text: r.text, page: null })),
  ].map((x) => ({ ...x, raw: shingles(x.text, false), masked: shingles(maskNames(x.text), true) }));

  const results: Result[] = [];
  let worst = { a: "", b: "", raw: 0, masked: 0 };
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    if (!a.page) continue;
    let best = { with: "", raw: 0, masked: 0 };
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const b = items[j];
      const raw = jaccard(a.raw, b.raw);
      const masked = jaccard(a.masked, b.masked);
      if (Math.max(raw, masked) > Math.max(best.raw, best.masked)) best = { with: b.path, raw, masked };
      if (j > i && Math.max(raw, masked) > Math.max(worst.raw, worst.masked)) worst = { a: a.path, b: b.path, raw, masked };
    }
    const page = a.page;
    const words = wordCount(a.text);
    const minWords = page.kind === "occupationHub" || page.kind === "netWorthHub" ? MIN_WORDS_HUB : MIN_WORDS;
    const missingData = Object.entries(page.dataFields)
      .filter(([, v]) => v == null || (typeof v === "number" && !Number.isFinite(v)))
      .map(([k]) => k);
    const reasons: string[] = [];
    if (words < minWords) reasons.push(`words ${words} < ${minWords}`);
    if (best.raw > MAX_SIMILARITY) reasons.push(`similarity ${best.raw.toFixed(3)} with ${best.with}`);
    if (missingData.length) reasons.push(`missing data: ${missingData.join(", ")}`);
    // Content numbers that rendered as NaN/undefined are also missing data.
    if (/\bNaN\b|undefined|\$NaN/.test(a.text)) reasons.push("text contains NaN/undefined");
    results.push({ path: a.path, kind: page.kind, words, minWords, missingData, maxSimilarity: best, pass: reasons.length === 0, reasons });
  }

  const failed = results.filter((r) => !r.pass);
  const byKind = (k: SeoPage["kind"]) => results.filter((r) => r.kind === k);
  const out = {
    generatedAt: new Date().toISOString(),
    rules: { minWords: MIN_WORDS, minWordsHub: MIN_WORDS_HUB, maxSimilarity: MAX_SIMILARITY, shingle: 5, comparedAgainstInsights: reference.length },
    summary: {
      pages: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      minWords: Math.min(...results.map((r) => r.words)),
      minWordsPage: results.reduce((a, b) => (b.words < a.words ? b : a)).path,
      mostSimilarPair: { a: worst.a, b: worst.b, raw: +worst.raw.toFixed(3), masked: +worst.masked.toFixed(3) },
      kinds: Object.fromEntries(
        (["occupation", "occupationHub", "netWorth", "netWorthHub", "state"] as const).map((k) => [k, { pages: byKind(k).length, failed: byKind(k).filter((r) => !r.pass).length, minWords: Math.min(...byKind(k).map((r) => r.words)) }])
      ),
    },
    failed: failed.map((r) => r.path),
    results,
  };
  fs.mkdirSync(path.join(__dirname, "../data/seo"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "../data/seo/quality-gate.json"), JSON.stringify(out, null, 1));

  console.log(`[seo-gate] ${results.length} pages checked in ${Date.now() - t0}ms (vs ${reference.length} insight articles)`);
  for (const [k, v] of Object.entries(out.summary.kinds)) console.log(`[seo-gate]   ${k}: ${v.pages} pages, ${v.failed} failed, min words ${v.minWords}`);
  console.log(`[seo-gate] min words: ${out.summary.minWords} (${out.summary.minWordsPage})`);
  console.log(`[seo-gate] most similar pair: ${worst.a} ~ ${worst.b} raw=${worst.raw.toFixed(3)} masked=${worst.masked.toFixed(3)} (limit ${MAX_SIMILARITY})`);
  if (failed.length) {
    console.log(`[seo-gate] FAILED (${failed.length}) — withheld from sitemap and set to noindex:`);
    for (const f of failed) console.log(`[seo-gate]   ${f.path}: ${f.reasons.join("; ")}`);
    if (process.env.SEO_GATE_STRICT === "1") process.exit(1);
  } else console.log("[seo-gate] all pages passed");
}

main();
