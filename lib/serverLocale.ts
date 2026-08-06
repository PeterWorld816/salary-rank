// Server-only helpers for reading the locale that middleware.ts derived from
// the request path (/us vs /kr) and stashed on request headers.

import { headers } from "next/headers";
import type { LangCode } from "./i18n";

export type AppLocale = "us" | "kr";

export function getAppLocale(): AppLocale {
  return headers().get("x-app-locale") === "kr" ? "kr" : "us";
}

export function getLangForLocale(locale: AppLocale): LangCode {
  return locale === "kr" ? "ko" : "en";
}

// The path as the browser sees it (e.g. "/kr/CA"), since the route itself
// only ever sees the rewritten "/us/CA" via params.
export function getOriginalPathname(): string {
  return headers().get("x-original-pathname") ?? "/us";
}
