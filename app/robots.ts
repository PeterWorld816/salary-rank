import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

// /us/result/* and /kr/result/* carry answers in the query string (?st=&co=&d=),
// so the combination space is unbounded — disallowing keeps crawl budget on
// pages that are actually worth indexing (home, state pages, insights, etc).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/us/result/", "/kr/result/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
