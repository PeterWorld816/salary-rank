import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";
import { getAllInsights } from "@/lib/insights";
import { US_STATES } from "@/data/us/stateMeta";
import { getCountiesForState } from "@/lib/usCountyPlaceData";

// /us and /kr are two locale-prefixed mirrors of the same app/us/** route
// tree (see middleware.ts) — each gets its own entry here since they're
// distinct indexable URLs. /us/result/** and /kr/result/** are intentionally
// left out: they're disallowed in app/robots.ts (unbounded query combos).
const LOCALE_BASES = ["/us", "/kr"] as const;
const INSIGHT_LANGS = { "/us": "en", "/kr": "ko" } as const;

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

    for (const state of US_STATES) {
      entries.push({
        url: absoluteUrl(`${base}/${state.abbr}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });

      // Now real per-county content pages (see app/us/[state]/[county]/page.tsx),
      // not the redirect they used to be — worth listing so they get crawled
      // rather than discovered only by following links from the state page.
      for (const county of getCountiesForState(state.fips)) {
        entries.push({
          url: absoluteUrl(`${base}/${state.abbr}/${county.fips}`),
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  }

  return entries;
}
