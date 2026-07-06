"use client";

import { useState, useEffect, createContext, useContext, createElement } from "react";
import type { ReactNode } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
export type LangCode = "ko" | "en";

export interface Translations {
  // ── Content placeholders (fill in when building a real app on this skeleton)
  appTitle: string;
  tagline: string;
  disclaimer: string;
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
    appTitle: "(앱 이름 placeholder)",
    tagline: "(한 줄 소개 placeholder)",
    disclaimer: "(안내 문구 placeholder)",
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
    appTitle: "(app title placeholder)",
    tagline: "(tagline placeholder)",
    disclaimer: "(disclaimer placeholder)",
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

// ── Context ────────────────────────────────────────────────────────────────────
const LS_KEY = "app_lang";

function detectBrowserLang(): LangCode {
  if (typeof navigator === "undefined") return "ko";
  return navigator.language.slice(0, 2).toLowerCase() === "ko" ? "ko" : "en";
}

interface LangCtx {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  t: Translations;
  dir: "ltr" | "rtl";
  languages: LangMeta[];
}

const LanguageContext = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("ko");

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) as LangCode | null;
    setLangState(saved ?? detectBrowserLang());
  }, []);

  function setLang(code: LangCode) {
    localStorage.setItem(LS_KEY, code);
    setLangState(code);
  }

  const meta = LANGUAGES.find((l) => l.code === lang)!;
  const t    = translations[lang];

  return createElement(LanguageContext.Provider, { value: { lang, setLang, t, dir: meta.dir, languages: LANGUAGES } }, children);
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useLanguage(): LangCtx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
