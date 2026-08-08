import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

// /us/result and /kr/result carry answers in the query string (?st=&co=&d=),
// so the combination space is unbounded — disallowing keeps crawl budget on
// pages that are actually worth indexing (home, state pages, insights, etc).
// No trailing slash: robots.txt disallow is a literal path prefix, and
// "/us/result/" would NOT match the dashboard's own URL ("/us/result",
// no trailing slash) — only its old /overall,/state,/demographic subpaths.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/us/result", "/kr/result"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
