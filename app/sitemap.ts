import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";
import { getAllInsights } from "@/lib/insights";
import { US_STATES } from "@/data/us/stateMeta";

// Only /us is listed. /kr is the same app/us/** route tree served in Korean
// (see middleware.ts) but it's noindex,follow (lib/seo.ts) and disallowed in
// app/robots.ts, so listing it would just advertise URLs we don't want
// crawled; /us pages instead declare the ko-KR alternate in their metadata.
// /us/result/** is left out for the same reason: unbounded query combos.
const LOCALE_BASES = ["/us"] as const;
const INSIGHT_LANGS = { "/us": "en" } as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const base of LOCALE_BASES) {
    entries.push({
      url: absoluteUrl(base),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    });

    for (const path of ["about", "privacy", "contact", "insights"]) {
      entries.push({
        url: absoluteUrl(`${base}/${path}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }

    for (const article of getAllInsights(INSIGHT_LANGS[base])) {
      entries.push({
        url: absoluteUrl(`${base}/insights/${article.slug}`),
        lastModified: new Date(article.date),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    // State pages only (51 per locale) — each has real, distinct content
    // (its own median/rank/thresholds). County (and place) pages below that
    // are deliberately left out: thousands of near-identical templated pages
    // in the sitemap reads as auto-generated thin content to search engines.
    // Those pages still exist and are still reachable by clicking through
    // the state map (and still get their own `noindex, follow` — see
    // app/[locale]/[state]/[county]/page.tsx and .../[place]/page.tsx) —
    // just not individually submitted for indexing.
    for (const state of US_STATES) {
      entries.push({
        url: absoluteUrl(`${base}/${state.abbr}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
