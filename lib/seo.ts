// Locale-aware page metadata (title/description/OG/Twitter/canonical) shared
// by every page under app/us/** — which also serves app/kr/** via the
// middleware.ts rewrite. Keep this separate from lib/i18n.ts's Translations:
// these are SEO-tuned strings for share cards, not in-app UI copy.

import type { Metadata } from "next";
import { translations } from "./i18n";
import type { AppLocale } from "./serverLocale";
import { absoluteUrl } from "./site-url";

const SITE_TITLE: Record<AppLocale, string> = {
  us: "What's Your US Income Percentile?",
  kr: translations.ko.usAppTitle,
};

const SITE_DESCRIPTION: Record<AppLocale, string> = {
  us: "See where your salary ranks in the US — by state, county, gender, and marital status. Free instant comparison.",
  kr: translations.ko.usTagline,
};

const OG_IMAGE: Record<AppLocale, string> = {
  us: "/og-us.png",
  kr: "/og-kr.png",
};

const OG_LOCALE: Record<AppLocale, string> = {
  us: "en_US",
  kr: "ko_KR",
};

export function siteTitle(locale: AppLocale): string {
  return SITE_TITLE[locale];
}

export function siteDescription(locale: AppLocale): string {
  return SITE_DESCRIPTION[locale];
}

export function pageMetadata(
  locale: AppLocale,
  pathname: string,
  title: string,
  description: string,
  opts?: { image?: string; type?: "website" | "article"; publishedTime?: string }
): Metadata {
  // Built as absolute URLs directly (not left relative for metadataBase to
  // resolve) so canonical/og:url/og:image/twitter:image are all correct
  // regardless of metadataBase — see lib/site-url.ts.
  const url = absoluteUrl(pathname);
  const image = absoluteUrl(opts?.image ?? OG_IMAGE[locale]);
  // Only /us is meant to rank: /kr is the same content in Korean UI for
  // visitors who switch languages, so it's noindex,follow — links out of it
  // still pass through, but it never competes with /us in search results.
  // The /us side still declares the ko-KR alternate (below) so Google
  // understands the two URLs are one page in two languages.
  const krUrl = absoluteUrl(`/kr${pathname.replace(/^\/(?:us|kr)(?=\/|$)/, "")}`);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      ...(locale === "us" ? { languages: { "ko-KR": krUrl } } : {}),
    },
    ...(locale === "kr" ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_TITLE[locale],
      type: opts?.type ?? "website",
      locale: OG_LOCALE[locale],
      images: [{ url: image, width: 1200, height: 630 }],
      ...(opts?.publishedTime ? { publishedTime: opts.publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function homeMetadata(locale: AppLocale, pathname: string): Metadata {
  return pageMetadata(locale, pathname, SITE_TITLE[locale], SITE_DESCRIPTION[locale]);
}

// Points a /us/result/* page's og:image/twitter:image at the dynamic per-share
// card (app/us/og/route.tsx) instead of the static OG_IMAGE fallback, carrying
// over just the two params that image needs (d, st) plus the locale it should
// render text in. Falls back to the static image when there's no "d" yet
// (e.g. a bare /us/result hit with no answers) so the route never
// renders its own "no data" fallback where the static one already works.
export function resultOgImage(locale: AppLocale, searchParams: Record<string, string | string[] | undefined>): string | undefined {
  const d = searchParams.d;
  if (typeof d !== "string") return undefined;
  const params = new URLSearchParams({ d, lang: locale === "kr" ? "ko" : "en" });
  const st = searchParams.st;
  if (typeof st === "string") params.set("st", st);
  return `/us/og?${params.toString()}`;
}

// Same dynamic image route (app/us/og/route.tsx), personalized instead by
// this *location's* own numbers rather than a visitor's ?d= answer — used
// by the state/county/place pages' generateMetadata, which only ever knows
// the location, not any particular visitor. Every field here is public,
// location-level data these pages already compute for their own on-page
// copy (median income, national percentile), so this never needs a
// visitor's input to produce a real (not fallback) share image.
export function locationOgImage(
  locale: AppLocale,
  params: { locationName: string; medianHouseholdIncome: number | null; percentile: number | null }
): string {
  const qs = new URLSearchParams({ lang: locale === "kr" ? "ko" : "en", loc: params.locationName });
  if (params.medianHouseholdIncome != null) qs.set("median", String(params.medianHouseholdIncome));
  if (params.percentile != null) qs.set("percentile", String(params.percentile));
  return `/us/og?${qs.toString()}`;
}
