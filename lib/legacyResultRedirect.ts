// The result flow used to be three separate steps — /result/overall,
// /result/state, /result/demographic — before it was consolidated into one
// scrolling dashboard at /result (see components/us/result/PersonalizedResult.tsx),
// which itself now redirects to /us/[state]/[county](/[place]) whenever a
// county was picked. These routes are disallowed in robots.txt (app/robots.ts)
// and never in the
// sitemap, so there's no SEO reason to keep them as real pages — but old
// shared links and bookmarks may still point at them, so each one redirects
// to the dashboard instead of 404ing, carrying every query param along.
import { permanentRedirect } from "next/navigation";
import { localeFromParams, localeBase } from "@/lib/serverLocale";

export type LegacyResultParams = { locale: string };
export type LegacyResultSearchParams = Record<string, string | string[] | undefined>;

function toQueryString(searchParams: LegacyResultSearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first != null) params.set(key, first);
  }
  return params.toString();
}

export function redirectToResultDashboard(params: LegacyResultParams, searchParams: LegacyResultSearchParams): never {
  const base = localeBase(localeFromParams(params));
  const qs = toQueryString(searchParams);
  permanentRedirect(qs ? `${base}/result?${qs}` : `${base}/result`);
}
