"use client";

import { useState, useEffect, createContext, useContext, createElement } from "react";
import type { ReactNode } from "react";
import {
  translations,
  LANGUAGES,
  detectBrowserLang,
  pick,
  type LangCode,
  type Translations,
  type LangMeta,
  type Localized,
} from "./i18n";

const LS_KEY = "app_lang";

interface LangCtx {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  t: Translations;
  tr: (text: Localized) => string;
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
  const tr   = (text: Localized) => pick(text, lang);

  return createElement(
    LanguageContext.Provider,
    { value: { lang, setLang, t, tr, dir: meta.dir, languages: LANGUAGES } },
    children
  );
}

export function useLanguage(): LangCtx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
