import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Only job left: pick a locale for a bare "/" hit.
//
// /us/** and /kr/** are real routes now (app/[locale]/**), so there's no
// rewrite and no x-app-locale header to thread — the segment itself carries
// the locale. That's deliberate: the old rewrite meant pages had to read the
// locale via headers(), which is a dynamic API, which disabled static
// rendering and ISR for the entire tree (see lib/serverLocale.ts).
//
// The matcher is scoped to "/" alone so middleware doesn't run — and can't
// accidentally opt anything out of the cache — on any other request.

function acceptsKorean(acceptLanguage: string | null): boolean {
  if (!acceptLanguage) return false;
  const primary = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  return primary.startsWith("ko");
}

export function middleware(request: NextRequest) {
  const locale = acceptsKorean(request.headers.get("accept-language")) ? "kr" : "us";
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/"],
};
