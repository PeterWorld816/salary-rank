// Server-only: decides whether ads are allowed to load on the current
// request. True only when the request's Host header matches
// NEXT_PUBLIC_SITE_URL's hostname exactly — so localhost, *.vercel.app
// deploys, and Vercel preview URLs never load AdSense, only the configured
// production domain does. Defaults to false (no ads) if the env var isn't
// set at all, rather than guessing.
import "server-only";
import { headers } from "next/headers";

export function isProductionHost(): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return false;

  let expectedHost: string;
  try {
    expectedHost = new URL(siteUrl).hostname.toLowerCase();
  } catch {
    return false;
  }

  const requestHost = (headers().get("host") ?? "").split(":")[0].toLowerCase();
  return requestHost.length > 0 && requestHost === expectedHost;
}

// Ads also need a configured AdSense publisher ID — without it there's
// nothing to load even on the production host.
export function getAdsenseClientId(): string | null {
  return process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || null;
}

export function adsEnabled(): boolean {
  return isProductionHost() && getAdsenseClientId() !== null;
}
