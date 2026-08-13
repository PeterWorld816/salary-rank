import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

// /us/result and /kr/result carry answers in the query string (?st=&co=&d=),
// so the combination space is unbounded — disallowing keeps crawl budget on
// pages that are actually worth indexing (home, state pages, insights, etc).
// No trailing slash: robots.txt disallow is a literal path prefix, and
// "/us/result/" would NOT match the dashboard's own URL ("/us/result",
// no trailing slash) — only its old /overall,/state,/demographic subpaths.
// /us/compare/[inviteId] is the same situation — one unique, unindexable
// page per invite link (see that route's own generateMetadata, which also
// sets robots: {index:false} directly, belt-and-suspenders).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/us/result", "/kr/result", "/us/compare", "/kr/compare"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
