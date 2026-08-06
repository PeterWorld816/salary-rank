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
