// The locale (/us vs /kr) as a plain function of the URL, read from the
// [locale] route segment's params — NOT from request headers.
//
// This used to read an x-app-locale header that middleware.ts set on a
// /kr -> /us rewrite. That worked, but headers() is a Next.js dynamic API:
// touching it anywhere in a route's tree (page, generateMetadata, or any
// layout above it) opts the whole route out of static rendering, so
// `export const revalidate` was silently ignored and every response came
// back `Cache-Control: private, no-cache, no-store`. Keeping the locale in
// the path instead means /us/** and /kr/** are both ordinary static params
// that Next.js can prerender and ISR-cache.

import type { LangCode } from "./i18n";

export type AppLocale = "us" | "kr";

export const APP_LOCALES = ["us", "kr"] as const satisfies readonly AppLocale[];

export function isAppLocale(value: string): value is AppLocale {
  return value === "us" || value === "kr";
}

// Drop-in for every `const locale = getAppLocale()` this file used to serve:
// pages take `params` (which always carries the [locale] segment) and pass it
// straight in. Unknown values can't actually reach a page — app/[locale]/layout.tsx
// notFound()s them first — so the fallback here is just to keep the type honest.
export function localeFromParams(params: { locale: string }): AppLocale {
  return isAppLocale(params.locale) ? params.locale : "us";
}

// The locale's URL prefix, for building internal links and canonical URLs
// ("/us", "/kr") — replaces the old getOriginalPathname() header read, which
// pages now reconstruct from their own params instead.
export function localeBase(locale: AppLocale): "/us" | "/kr" {
  return `/${locale}`;
}

export function getLangForLocale(locale: AppLocale): LangCode {
  return locale === "kr" ? "ko" : "en";
}
