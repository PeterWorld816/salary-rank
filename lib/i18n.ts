// Pure i18n data/logic — no React, no "use client". Safe to import from
// client components, server components, and edge routes (e.g. app/api/og)
// alike. The React-facing context/hook lives in lib/LanguageProvider.tsx.
//
// This is the single place UI chrome copy (buttons, nav, disclaimers) lives.
// Content data (quiz questions, result copy) lives in data/*.ts using the
// same `Localized` shape — see pick() below to resolve either one.

export type LangCode = "ko" | "en";

// Any piece of content that varies by language — used across data/*.ts too.
export type Localized = Record<LangCode, string>;

export function pick(text: Localized, lang: LangCode): string {
  return text[lang] ?? text.ko;
}

export interface Translations {
  // ── Content placeholders (fill in when building a real app on this skeleton)
  appTitle: string;
  tagline: string;
  disclaimer: string;
  // ── Result screen copy
  resultCardLabel: string;
  shareTitle: string; // template: {emoji} {percent} {title}
  // ── Nav / actions (structural chrome, real copy)
  home: string;
  start: string;
  back: string;
  next: string;
  retry: string;
  share: string;
  save: string;
  copied: string;
  shareFailed: string;
  saveFailed: string;
  resultNotFound: string;
  resultNotFoundDesc: string;
}

export const translations: Record<LangCode, Translations> = {
  ko: {
    appTitle: "🧠 뇌 구조 테스트",
    tagline: "질문 8개로 알아보는 내 뇌 속 비율",
    disclaimer: "이 테스트는 재미로만 봐주세요. 과학적 근거는 1도 없습니다 😅",
    resultCardLabel: "내 뇌 구조는?",
    shareTitle: "{emoji} 내 뇌의 {percent}%는 '{title}'",
    home: "홈",
    start: "시작하기",
    back: "뒤로",
    next: "다음",
    retry: "다시 하기",
    share: "공유하기",
    save: "이미지 저장",
    copied: "링크 복사됨!",
    shareFailed: "공유 실패",
    saveFailed: "저장 실패. 다시 시도해주세요.",
    resultNotFound: "결과를 찾을 수 없어요",
    resultNotFoundDesc: "다시 시작해서 결과를 확인해보세요.",
  },
  en: {
    appTitle: "🧠 Brain Map Test",
    tagline: "8 questions to map what's filling your brain right now",
    disclaimer: "For fun only — zero scientific basis 😅",
    resultCardLabel: "What fills my brain?",
    shareTitle: "{emoji} {percent}% of my brain is '{title}'",
    home: "Home",
    start: "Start",
    back: "Back",
    next: "Next",
    retry: "Try Again",
    share: "Share",
    save: "Save Image",
    copied: "Link copied!",
    shareFailed: "Share failed",
    saveFailed: "Save failed. Please try again.",
    resultNotFound: "Result not found",
    resultNotFoundDesc: "Start over to get your result.",
  },
};

// ── Language metadata ────────────────────────────────────────────────────────
export interface LangMeta {
  code: LangCode;
  label: string;
  dir: "ltr" | "rtl";
}

export const LANGUAGES: LangMeta[] = [
  { code: "ko", label: "한국어", dir: "ltr" },
  { code: "en", label: "English", dir: "ltr" },
];

export const DEFAULT_LANG: LangCode = "ko";

export function detectBrowserLang(): LangCode {
  if (typeof navigator === "undefined") return DEFAULT_LANG;
  return navigator.language.slice(0, 2).toLowerCase() === "ko" ? "ko" : "en";
}

export function isLangCode(value: unknown): value is LangCode {
  return value === "ko" || value === "en";
}
