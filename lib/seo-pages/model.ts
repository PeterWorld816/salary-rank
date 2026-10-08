// Shared shape for the data-driven SEO pages (/us/occupations/*,
// /us/net-worth/*, their hubs, and the state-page "deep dive" block).
//
// Every page is built as plain data first — headings, paragraphs, tables —
// and only then rendered (components/seo/SeoArticle.tsx). The same objects
// feed the quality gate (scripts/seoQualityGate.ts), so what the gate counts
// and compares is exactly what ships: there's no second copy of the text to
// drift out of sync.
//
// Server/build-time only. Some builders read public/*.json with fs.

export type SeoTable = { caption?: string; head: string[]; rows: string[][]; note?: string };

export type SeoSection = {
  heading: string;
  paragraphs: string[];
  table?: SeoTable;
  // Simple horizontal bars (label, value, display) for a small chart.
  bars?: { label: string; value: number; display: string; highlight?: boolean }[];
};

export type SeoLink = { href: string; label: string; note?: string };

export type SeoPage = {
  path: string; // "/us/occupations/registered-nurses"
  kind: "occupation" | "netWorth" | "occupationHub" | "netWorthHub" | "state";
  title: string;
  description: string;
  h1: string;
  lede: string;
  sections: SeoSection[];
  // Where the mid-article ad goes (after this many sections).
  midAdAfter: number;
  related: SeoLink[];
  cta?: { href: string; label: string; body: string };
  breadcrumbs: { name: string; path: string }[];
  sources: string[];
  // Every number the page's claims rest on — the gate fails the page if any
  // is null/NaN (rule 3: no page with missing data).
  dataFields: Record<string, number | null | undefined>;
};

// Commentary only (lede + headings + paragraphs) — tables and bars are data,
// not prose, so they don't count toward the 400-word floor or similarity.
export function commentaryText(page: Pick<SeoPage, "lede" | "sections">): string {
  return [page.lede, ...page.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join("\n");
}

export function wordCount(text: string): number {
  return (text.match(/[A-Za-z0-9$%][A-Za-z0-9$%,.'’–-]*/g) ?? []).length;
}

// Deterministic per-page seed, so a page always renders the same variant.
export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // FNV-1a alone leaves the low bits depending only on the inputs' low bits,
  // and `% n` reads exactly those — so finish with murmur3's fmix32 to
  // spread every input bit across the result.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// Each (seed, salt) pair hashes independently, so paragraph A's variant
// says nothing about paragraph B's — otherwise a page family collapses to a
// handful of identical "shapes" with only the numbers swapped.
export function pick<T>(options: T[], seed: number, salt = 0): T {
  return options[seedOf(`${seed}:${salt}`) % options.length];
}

export const pct = (n: number) => `${Math.round(n)}%`;

export function signedPct(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}%` : r < 0 ? `−${Math.abs(r)}%` : "0%";
}

export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
