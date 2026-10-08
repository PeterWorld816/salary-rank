// Metadata for the /us/occupations and /us/net-worth pages: self canonical,
// unique title/description, noindex when the quality gate withheld the page.
// These pages are English-only (/kr redirects to /us), so — unlike
// pageMetadata()'s default — no ko-KR alternate is declared.
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { isWithheldFromSearch } from "@/lib/seo-pages/gate";
import type { SeoPage } from "@/lib/seo-pages/model";

export function seoPageMetadata(page: SeoPage): Metadata {
  const meta = pageMetadata("us", page.path, page.title, page.description, { type: "article" });
  return {
    ...meta,
    alternates: { canonical: meta.alternates?.canonical },
    ...(isWithheldFromSearch(page.path) ? { robots: { index: false, follow: true } } : {}),
  };
}
