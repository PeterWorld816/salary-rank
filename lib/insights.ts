// Markdown-backed "insights" articles under /us/insights (and /kr/insights,
// same pages via middleware.ts's rewrite). Drop a new .md file into
// content/insights/<lang>/ and it shows up in the list automatically — no
// code change needed, just a redeploy so the new file ships with the build.
//
// Server-only (fs access) — never import this from a "use client" file.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import type { LangCode } from "./i18n";

const CONTENT_DIR = path.join(process.cwd(), "content", "insights");

export type InsightMeta = {
  slug: string;
  title: string;
  description: string;
  date: string; // "YYYY-MM-DD", quote it in frontmatter or YAML parses it into a Date
};

export type Insight = InsightMeta & {
  html: string;
  ogImage?: string;
};

function dirFor(lang: LangCode): string {
  return path.join(CONTENT_DIR, lang);
}

// YAML auto-parses an unquoted "date: 2026-08-06" into a real Date — normalize
// either form back to a plain "YYYY-MM-DD" string so callers don't have to
// remember to quote it in frontmatter.
function normalizeDate(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

function readFrontmatter(lang: LangCode, slug: string): { data: Record<string, unknown>; content: string } | null {
  const file = path.join(dirFor(lang), `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  return { data, content };
}

// Sorted newest-first. Articles missing required frontmatter are skipped
// (logged, not thrown — one bad file shouldn't 500 the whole list).
export function getAllInsights(lang: LangCode): InsightMeta[] {
  const dir = dirFor(lang);
  if (!fs.existsSync(dir)) return [];

  const metas: InsightMeta[] = [];
  for (const filename of fs.readdirSync(dir)) {
    if (!filename.endsWith(".md")) continue;
    const slug = filename.replace(/\.md$/, "");
    const parsed = readFrontmatter(lang, slug);
    if (!parsed) continue;
    const { data } = parsed;
    const date = normalizeDate(data.date);
    if (typeof data.title !== "string" || typeof data.description !== "string" || !date) {
      // eslint-disable-next-line no-console -- surfaces a malformed content file instead of silently dropping it
      console.warn(`[insights] ${lang}/${filename} is missing title/description/date frontmatter — skipped`);
      continue;
    }
    metas.push({ slug, title: data.title, description: data.description, date });
  }

  return metas.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getInsightBySlug(lang: LangCode, slug: string): Insight | null {
  const parsed = readFrontmatter(lang, slug);
  if (!parsed) return null;
  const { data, content } = parsed;
  const date = normalizeDate(data.date);
  if (typeof data.title !== "string" || typeof data.description !== "string" || !date) return null;

  return {
    slug,
    title: data.title,
    description: data.description,
    date,
    ogImage: typeof data.ogImage === "string" ? data.ogImage : undefined,
    html: marked.parse(content, { gfm: true }) as string,
  };
}

// ── In-article ad positions ────────────────────────────────────────────────
// The rendered article split into three chunks so the page can drop an ad
// between them: [start, after the 3rd paragraph] [middle] [closing paragraph].

type Block = { tag: string; html: string };

const VOID_TAGS = new Set(["br", "hr", "img", "input", "wbr"]);

// marked's output is a flat run of top-level blocks (<h2>, <p>, <ul>,
// <table>, ...). Walks the tags tracking nesting depth and cuts wherever it
// returns to zero, so a <p> inside a <blockquote> or <li> is never mistaken
// for a top-level paragraph.
function topLevelBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  let depth = 0;
  let start = 0;
  let openTag = "";
  for (let m = tagRe.exec(html); m; m = tagRe.exec(html)) {
    const [, closing, rawName, selfClosing] = m;
    const name = rawName.toLowerCase();
    if (depth === 0 && !closing) {
      start = m.index;
      openTag = name;
    }
    if (closing) depth--;
    else if (!VOID_TAGS.has(name) && !selfClosing) depth++;
    if (depth === 0) {
      const end = m.index + m[0].length;
      blocks.push({ tag: openTag, html: html.slice(start, end) });
    }
  }
  return blocks;
}

const hasInteractive = (block: Block | undefined) =>
  !block || /<(a|button|table|input|select|form)\b/i.test(block.html) || block.tag === "table";

// Mid-article: right after the 3rd top-level paragraph — or the first later
// paragraph that qualifies — and only between two plain text blocks, never
// directly beside a link, button or table. End: in front of the closing
// paragraph when it's the "check where you stand" link line, so the ad sits
// at the end of the text but before that link. Either position comes back
// null when the article has no spot that fits; the page then just shows the
// ad(s) it can.
export function splitForArticleAds(html: string): { start: string; middle: string; end: string; midAd: boolean } {
  const blocks = topLevelBlocks(html);
  const join = (from: number, to: number) => blocks.slice(from, to).map((b) => b.html).join("\n");

  const last = blocks[blocks.length - 1];
  const endCut = last && last.tag === "p" && /<a\b/i.test(last.html) ? blocks.length - 1 : blocks.length;

  let midCut = -1;
  let paragraphs = 0;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].tag !== "p") continue;
    paragraphs++;
    const next = blocks[i + 1];
    if (
      paragraphs >= 3 &&
      i + 1 < endCut - 1 &&
      !hasInteractive(blocks[i]) &&
      !hasInteractive(next) &&
      ["p", "h2", "h3"].includes(next.tag)
    ) {
      midCut = i + 1;
      break;
    }
  }

  if (midCut === -1) return { start: join(0, endCut), middle: "", end: join(endCut, blocks.length), midAd: false };
  return { start: join(0, midCut), middle: join(midCut, endCut), end: join(endCut, blocks.length), midAd: true };
}
