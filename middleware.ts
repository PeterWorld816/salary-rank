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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const locale = acceptsKorean(request.headers.get("accept-language")) ? "kr" : "us";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
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
