// Decides whether AdSense is allowed to load. Two halves, deliberately
// evaluated in two different places:
//
//   1. Is AdSense configured at all? (NEXT_PUBLIC_ADSENSE_CLIENT_ID +
//      NEXT_PUBLIC_SITE_URL) — build-time env, safe to check on the server.
//   2. Is this the production host? — used to keep ads off localhost,
//      *.vercel.app previews and any other deploy sharing the same build.
//
// (2) used to be a server-side `headers().get("host")` check. It isn't
// anymore: headers() is a Next.js dynamic API, and AdSenseScript renders in
// the ROOT layout, so that one call opted every route in the app out of
// static rendering — `export const revalidate` on the county/place pages was
// silently ignored and every response came back `no-store`. The host is now
// compared client-side against window.location (see useIsProductionHost),
// which gates the AdSense script and every <ins> just as tightly: no ad
// request is ever made off the production domain.
//
// No "server-only" import here anymore either — this module is now imported
// from client components too.

export function getAdsenseClientId(): string | null {
  return process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || null;
}

// The one hostname allowed to serve ads, from NEXT_PUBLIC_SITE_URL.
// Returns null (no ads anywhere) if it isn't set or isn't a valid URL,
// rather than guessing.
export function getProductionHost(): string | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return null;
  try {
    return new URL(siteUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// Build-time half of the gate: is there anything to render at all? Safe to
// call from a Server Component — it reads env vars only.
export function adsConfigured(): boolean {
  return getAdsenseClientId() !== null && getProductionHost() !== null;
}
