import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";
import { getAllInsights } from "@/lib/insights";
import { US_STATES } from "@/data/us/stateMeta";
import { getCountiesForState } from "@/lib/usCountyPlaceData";

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
