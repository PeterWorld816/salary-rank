import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Site has one implementation (app/us/**) serving two locale-prefixed paths:
// /us (English default) and /kr (Korean default). /kr/* is rewritten to the
// same app/us/* route tree so there's no duplicated route code — the locale
// is threaded through via the x-app-locale request header instead.

function acceptsKorean(acceptLanguage: string | null): boolean {
  if (!acceptLanguage) return false;
  const primary = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  return primary.startsWith("ko");
}

// /us/[state]/[county] (and /kr/...) used to be the single-page result URL,
// with answers carried in ?d=. It's now a real SEO content page (see
// app/us/[state]/[county]/page.tsx) that ISR-caches on `revalidate = 86400`
// — which only works if the page itself never reads searchParams (Next.js
// forces full per-request dynamic rendering for any page that does). So the
// "old shared link still works" redirect lives here instead, at the edge,
// before it ever reaches that page. It points straight at /result (the
// unified dashboard, see app/us/result/DashboardResultClient.tsx) rather
// than the old /result/overall first step, which no longer exists as a real
// page — just a redirect stub (lib/legacyResultRedirect.ts).
const LEGACY_COUNTY_RESULT_PATH = /^\/(us|kr)\/([a-z]{2})\/(\d{5})$/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const locale = acceptsKorean(request.headers.get("accept-language")) ? "kr" : "us";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  const legacyMatch = pathname.match(LEGACY_COUNTY_RESULT_PATH);
  if (legacyMatch && request.nextUrl.searchParams.has("d")) {
    const [, prefix, stateAbbr, countyFips] = legacyMatch;
    const url = request.nextUrl.clone();
    url.pathname = `/${prefix}/result`;
    url.searchParams.set("st", stateAbbr);
    url.searchParams.set("co", countyFips);
    return NextResponse.redirect(url);
  }

  const isKr = pathname === "/kr" || pathname.startsWith("/kr/");
  const isUs = pathname === "/us" || pathname.startsWith("/us/");
  if (!isKr && !isUs) return NextResponse.next();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-app-locale", isKr ? "kr" : "us");
  requestHeaders.set("x-original-pathname", pathname);

  if (isKr) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/kr" ? "/us" : `/us${pathname.slice("/kr".length)}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/).*)"],
};
